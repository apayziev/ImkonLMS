"""add_grade_subject_tables_and_soft_delete

Revision ID: 7fa0be26d7eb
Revises: a6b5bffd0402
Create Date: 2026-06-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '7fa0be26d7eb'
down_revision: Union[str, None] = 'a6b5bffd0402'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add soft delete columns to user table (BaseModel now has SoftDeleteMixin)
    op.add_column('user', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('user', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.create_index(op.f('ix_user_is_deleted'), 'user', ['is_deleted'], unique=False)

    # Create grade table
    op.create_table(
        'grade',
        sa.Column('level', sa.SmallInteger(), nullable=False),
        sa.Column('section', sa.String(length=50), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('current_timestamp(0)'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_grade_level'), 'grade', ['level'], unique=False)
    op.create_index(op.f('ix_grade_is_deleted'), 'grade', ['is_deleted'], unique=False)
    op.create_index('ix_grade_level_section', 'grade', ['level', 'section'], unique=False)

    # Create subject table
    op.create_table(
        'subject',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('name_uz', sa.String(length=100), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('current_timestamp(0)'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_subject_name'), 'subject', ['name'], unique=True)
    op.create_index(op.f('ix_subject_is_deleted'), 'subject', ['is_deleted'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_subject_is_deleted'), table_name='subject')
    op.drop_index(op.f('ix_subject_name'), table_name='subject')
    op.drop_table('subject')

    op.drop_index('ix_grade_level_section', table_name='grade')
    op.drop_index(op.f('ix_grade_is_deleted'), table_name='grade')
    op.drop_index(op.f('ix_grade_level'), table_name='grade')
    op.drop_table('grade')

    op.drop_index(op.f('ix_user_is_deleted'), table_name='user')
    op.drop_column('user', 'is_deleted')
    op.drop_column('user', 'deleted_at')
