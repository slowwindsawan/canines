"""added reset password.

Revision ID: 45350689ef8c
Revises: 0089b5ce9b31
Create Date: 2025-09-19 21:59:52.356565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '45350689ef8c'
down_revision: Union[str, Sequence[str], None] = '0089b5ce9b31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add password_resets table."""
    op.create_table(
        "password_resets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("otp", sa.String(length=6), nullable=False),
        sa.Column("otp_expiry", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_password_resets_email", "password_resets", ["email"], unique=False)
    op.create_index("ix_password_resets_id", "password_resets", ["id"], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop password_resets table."""
    op.drop_index("ix_password_resets_id", table_name="password_resets")
    op.drop_index("ix_password_resets_email", table_name="password_resets")
    op.drop_table("password_resets")