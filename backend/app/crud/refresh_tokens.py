"""CRUD for refresh-token rotation with replay detection."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.refresh_token import RefreshToken

# Grace window for the previous refresh token after rotation. If the same jti is
# presented again within this window (e.g. simultaneous tabs racing to refresh),
# we return the existing successor instead of treating it as replay. Standard
# OWASP-recommended mitigation against false-positive lockouts.
ROTATION_GRACE = timedelta(seconds=30)


@dataclass(slots=True)
class IssuedRefresh:
    family_id: uuid.UUID
    jti: uuid.UUID


@dataclass(slots=True)
class RotationResult:
    new_jti: uuid.UUID
    family_id: uuid.UUID
    subject: str
    role: str | None


class RefreshRotationError(Exception):
    """Refresh token is invalid, expired, replayed, or revoked."""


def _expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


async def issue(db: AsyncSession, *, subject: str, role: str | None = None) -> IssuedRefresh:
    """Mint a fresh family + jti for a brand-new login."""
    family_id = uuid.uuid4()
    jti = uuid.uuid4()
    db.add(RefreshToken(
        subject=subject,
        role=role,
        family_id=family_id,
        jti=jti,
        expires_at=_expiry(),
    ))
    await db.commit()
    return IssuedRefresh(family_id=family_id, jti=jti)


async def rotate(db: AsyncSession, *, jti: uuid.UUID) -> RotationResult:
    """Mark the presented jti used and mint a successor in the same family.

    Raises RefreshRotationError on any failure mode (unknown / replay / expired).
    Within ROTATION_GRACE of a successful rotation, the same jti can be presented
    again (e.g. multi-tab race) and will receive the existing successor instead
    of triggering family revocation. Outside that window, replay nukes the
    entire family.
    """
    row = (await db.execute(
        select(RefreshToken)
        .where(RefreshToken.jti == jti)
        .with_for_update()
    )).scalar_one_or_none()

    if row is None:
        raise RefreshRotationError("unknown jti")

    now = datetime.now(UTC)

    if row.used_at is not None:
        # Grace window: if rotated very recently, return the existing successor
        # rather than revoking. Same client refreshing twice (multi-tab) is
        # benign; only treat as replay outside the window.
        if (now - row.used_at) <= ROTATION_GRACE:
            successor = (await db.execute(
                select(RefreshToken)
                .where(
                    RefreshToken.family_id == row.family_id,
                    RefreshToken.used_at.is_(None),
                    RefreshToken.expires_at > now,
                )
                .order_by(RefreshToken.created_at.desc())
                .limit(1)
            )).scalar_one_or_none()
            if successor is not None:
                return RotationResult(
                    new_jti=successor.jti,
                    family_id=row.family_id,
                    subject=row.subject,
                    role=row.role,
                )
        # Real replay — kill the whole family.
        await db.execute(
            delete(RefreshToken).where(RefreshToken.family_id == row.family_id)
        )
        await db.commit()
        raise RefreshRotationError("replay detected; family revoked")

    if row.expires_at < now:
        await db.delete(row)
        await db.commit()
        raise RefreshRotationError("expired")

    row.used_at = now
    new_jti = uuid.uuid4()
    db.add(RefreshToken(
        subject=row.subject,
        role=row.role,
        family_id=row.family_id,
        jti=new_jti,
        expires_at=_expiry(),
    ))
    await db.commit()

    return RotationResult(
        new_jti=new_jti,
        family_id=row.family_id,
        subject=row.subject,
        role=row.role,
    )


async def revoke_family(db: AsyncSession, family_id: uuid.UUID) -> None:
    """Logout: drop every token in the family."""
    await db.execute(
        delete(RefreshToken).where(RefreshToken.family_id == family_id)
    )
    await db.commit()


async def purge_expired(db: AsyncSession) -> int:
    """Background cleanup — return how many rows were dropped."""
    result = await db.execute(
        delete(RefreshToken).where(RefreshToken.expires_at < datetime.now(UTC))
    )
    await db.commit()
    return result.rowcount or 0
