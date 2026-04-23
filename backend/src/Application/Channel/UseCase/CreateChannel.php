<?php

declare(strict_types=1);

namespace App\Application\Channel\UseCase;

use App\Application\Channel\DTO\ChannelNameInput;
use App\Application\Channel\DTO\ChannelView;
use App\Application\Channel\Exception\ChannelAlreadyExistsException;
use App\Core\Channel\Identity\Channel;
use App\Core\Channel\Identity\ChannelMembership;
use App\Core\Channel\Storage\ChannelMembershipRepositoryInterface;
use App\Core\Channel\Storage\ChannelRepositoryInterface;
use App\Core\User\Identity\User;

final readonly class CreateChannel
{
    public function __construct(
        private ChannelRepositoryInterface $channels,
        private ChannelMembershipRepositoryInterface $memberships,
    ) {}

    public function handle(User $user, ChannelNameInput $input): ChannelView
    {
        $existing = $this->channels->findByName($input->slug);
        if ($existing !== null) {
            throw new ChannelAlreadyExistsException('CHANNEL_ALREADY_EXISTS');
        }

        $channel = new Channel();
        $channel->name = $input->slug;
        $channel->created_by = $user;
        $this->channels->save($channel);

        $membership = new ChannelMembership();
        $membership->channel = $channel;
        $membership->user = $user;
        $this->memberships->save($membership);

        return ChannelView::fromChannel($channel);
    }
}
