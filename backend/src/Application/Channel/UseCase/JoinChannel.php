<?php

declare(strict_types=1);

namespace App\Application\Channel\UseCase;

use App\Application\Channel\DTO\ChannelNameInput;
use App\Application\Channel\DTO\ChannelView;
use App\Application\Channel\Exception\ChannelNotFoundException;
use App\Core\Channel\Identity\ChannelMembership;
use App\Core\Channel\Storage\ChannelMembershipRepositoryInterface;
use App\Core\Channel\Storage\ChannelRepositoryInterface;
use App\Core\User\Identity\User;

final readonly class JoinChannel
{
    public function __construct(
        private ChannelRepositoryInterface $channels,
        private ChannelMembershipRepositoryInterface $memberships,
    ) {}

    public function handle(User $user, ChannelNameInput $input): ChannelView
    {
        $channel = $this->channels->findByName($input->slug);
        if ($channel === null) {
            throw new ChannelNotFoundException('CHANNEL_NOT_FOUND');
        }

        $existing_membership = $this->memberships->findByChannelAndUser($channel, $user);
        if ($existing_membership === null) {
            $membership = new ChannelMembership();
            $membership->channel = $channel;
            $membership->user = $user;
            $this->memberships->save($membership);
        }

        return ChannelView::fromChannel($channel);
    }
}
