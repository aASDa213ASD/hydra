<?php

declare(strict_types=1);

namespace App\Core\Channel\Storage;

use App\Core\Channel\Identity\Channel;
use App\Core\Channel\Identity\ChannelMembership;
use App\Core\User\Identity\User;

interface ChannelMembershipRepositoryInterface
{
    public function save(ChannelMembership $membership): void;

    public function findByChannelAndUser(Channel $channel, User $user): ?ChannelMembership;

    public function countByChannel(Channel $channel): int;

    public function findChannelsByUser(User $user): array;
}
