<?php

declare(strict_types=1);

namespace App\Application\Channel\DTO;

use App\Core\Channel\Identity\Channel;

final readonly class ChannelView
{
    private function __construct(
        public string $name,
    ) {}

    public static function fromChannel(Channel $channel): self
    {
        return new self(name: '#' . $channel->name);
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
        ];
    }
}
