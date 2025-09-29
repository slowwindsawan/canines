"""add weight_unit to dogs only

Revision ID: 20952366ef94
Revises: 45350689ef8c
Create Date: 2025-09-29 13:57:01.748835
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20952366ef94'
down_revision: Union[str, Sequence[str], None] = '45350689ef8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add dogs.weight_unit if missing."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # safety: only add the column if it doesn't already exist
    cols = [c["name"] for c in inspector.get_columns("dogs")]
    if "weight_unit" not in cols:
        op.add_column(
            "dogs",
            sa.Column("weight_unit", sa.String(length=25), nullable=True),
        )
    else:
        # no-op if column exists
        print("upgrade: dogs.weight_unit already exists, skipping add_column.")


def downgrade() -> None:
    """Downgrade schema: drop dogs.weight_unit if present."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    cols = [c["name"] for c in inspector.get_columns("dogs")]
    if "weight_unit" in cols:
        op.drop_column("dogs", "weight_unit")
    else:
        print("downgrade: dogs.weight_unit does not exist, skipping drop_column.")
