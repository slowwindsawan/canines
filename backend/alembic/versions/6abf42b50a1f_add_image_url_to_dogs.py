"""add image_url to dogs

Revision ID: 6abf42b50a1f
Revises: 50b6b209ec0f
Create Date: 2025-09-10 13:07:46.129740

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6abf42b50a1f'
down_revision: Union[str, Sequence[str], None] = '50b6b209ec0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('dogs', sa.Column('image_url', sa.String(length=512), nullable=True))


def downgrade():
    op.drop_column('dogs', 'image_url')