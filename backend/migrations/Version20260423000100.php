<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260423000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create channels and channel_memberships tables';
    }

    public function up(Schema $schema): void
    {
        $channels = $schema->createTable('channels');
        $channels->addColumn('id', 'integer', ['autoincrement' => true]);
        $channels->addColumn('name', 'string', ['length' => 32]);
        $channels->addColumn('created_by_user_id', 'integer');
        $channels->addColumn('created_at', 'datetime', ['notnull' => false]);
        $channels->addColumn('updated_at', 'datetime', ['notnull' => false]);
        $channels->setPrimaryKey(['id']);
        $channels->addUniqueIndex(['name'], 'uniq_channels_name');
        $channels->addIndex(['created_by_user_id'], 'idx_channels_created_by_user_id');
        $channels->addForeignKeyConstraint('users', ['created_by_user_id'], ['id'], ['onDelete' => 'CASCADE'], 'fk_channels_created_by_user_id');

        $memberships = $schema->createTable('channel_memberships');
        $memberships->addColumn('id', 'integer', ['autoincrement' => true]);
        $memberships->addColumn('channel_id', 'integer');
        $memberships->addColumn('user_id', 'integer');
        $memberships->addColumn('joined_at', 'datetime', ['notnull' => false]);
        $memberships->setPrimaryKey(['id']);
        $memberships->addUniqueIndex(['channel_id', 'user_id'], 'uniq_channel_membership');
        $memberships->addIndex(['channel_id'], 'idx_channel_memberships_channel_id');
        $memberships->addIndex(['user_id'], 'idx_channel_memberships_user_id');
        $memberships->addForeignKeyConstraint('channels', ['channel_id'], ['id'], ['onDelete' => 'CASCADE'], 'fk_channel_memberships_channel_id');
        $memberships->addForeignKeyConstraint('users', ['user_id'], ['id'], ['onDelete' => 'CASCADE'], 'fk_channel_memberships_user_id');
    }

    public function down(Schema $schema): void
    {
        $schema->dropTable('channel_memberships');
        $schema->dropTable('channels');
    }
}
