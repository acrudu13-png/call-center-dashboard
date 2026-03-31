"""Add call_types table and call_type fields

Revision ID: 011_call_types
Revises: 010_user_permissions
"""

from alembic import op
import sqlalchemy as sa

revision = "011_call_types"
down_revision = "010_user_permissions"
branch_labels = None
depends_on = None


def upgrade():
    # Call types table
    op.create_table(
        "call_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Seed default types
    op.execute("""
        INSERT INTO call_types (key, name, description, sort_order) VALUES
        ('customer_support', 'Customer Support', 'Apeluri de suport tehnic sau informational — clientul contacteaza pentru rezolvarea unei probleme, intrebare despre factura, servicii, etc.', 1),
        ('sales', 'Sales', 'Apeluri de vanzare — agentul propune produse/servicii noi, upgrade-uri, oferte promotionale.', 2),
        ('debt_collection', 'Debt Collection', 'Apeluri de recuperare creante — agentul contacteaza clientul pentru plata restantelor.', 3),
        ('retention', 'Retention', 'Apeluri de retentie — clientul doreste sa renunte la serviciu, agentul incearca sa il convinga sa ramana.', 4),
        ('other', 'Other', 'Alte tipuri de apeluri care nu se incadreaza in categoriile de mai sus.', 5)
    """)

    # Add call_type to calls
    op.add_column("calls", sa.Column("call_type", sa.String(50), nullable=True, index=True))

    # Add call_types to qa_rules
    op.add_column("qa_rules", sa.Column("call_types", sa.JSON(), server_default="[]", nullable=False))


def downgrade():
    op.drop_column("qa_rules", "call_types")
    op.drop_column("calls", "call_type")
    op.drop_table("call_types")
