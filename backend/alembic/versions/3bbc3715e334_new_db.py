"""new db

Revision ID: 3bbc3715e334
Revises: 2bbdd7dbfbfd
Create Date: 2025-09-17 08:21:49.775150

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3bbc3715e334'
down_revision: Union[str, Sequence[str], None] = '2bbdd7dbfbfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
