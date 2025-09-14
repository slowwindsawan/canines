"""Add role column to users

Revision ID: 2bbdd7dbfbfd
Revises: 3e50de129f9f
Create Date: 2025-09-14 18:11:14.857452

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2bbdd7dbfbfd'
down_revision: Union[str, Sequence[str], None] = '3e50de129f9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the enum
userrole_enum = sa.Enum("user", "admin", name="userrole")

def upgrade():
    # Create the enum type
    userrole_enum.create(op.get_bind(), checkfirst=True)

    # Add the column with default
    op.add_column(
        "users",
        sa.Column(
            "role",
            userrole_enum,
            nullable=False,
            server_default="user"
        )
    )


def downgrade():
    # Drop the column
    op.drop_column("users", "role")

    # Drop the enum type
    userrole_enum.drop(op.get_bind(), checkfirst=True)
    