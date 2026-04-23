<?php

declare(strict_types=1);

namespace App\Core\Channel\Storage;

use App\Core\Channel\Identity\Channel;

interface ChannelRepositoryInterface
{
    public function save(Channel $channel): void;

    public function findByName(string $name): ?Channel;

    public function findById(int $id): ?Channel;
}
