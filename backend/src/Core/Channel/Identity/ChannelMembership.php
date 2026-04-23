<?php

declare(strict_types=1);

namespace App\Core\Channel\Identity;

use App\Core\User\Identity\User;
use App\Infrastructure\Adapter\Persistence\Doctrine\ChannelMembershipRepository;
use DateTime;
use DateTimeZone;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChannelMembershipRepository::class)]
#[ORM\Table(name: 'channel_memberships')]
#[ORM\UniqueConstraint(name: 'uniq_channel_membership', columns: ['channel_id', 'user_id'])]
#[ORM\HasLifecycleCallbacks]
class ChannelMembership
{
    #[ORM\Id]
    #[ORM\Column(name: 'id', type: Types::INTEGER)]
    #[ORM\GeneratedValue(strategy: 'AUTO')]
    public ?int $id = null {
        get => $this->id;
    }

    #[ORM\ManyToOne(targetEntity: Channel::class)]
    #[ORM\JoinColumn(name: 'channel_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    public ?Channel $channel = null {
        get => $this->channel;
        set => $this->channel = $value;
    }

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    public ?User $user = null {
        get => $this->user;
        set => $this->user = $value;
    }

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $joined_at = null {
        get => $this->joined_at;
        set => $this->joined_at = $value;
    }

    #[ORM\PrePersist]
    public function beforePersist(): void
    {
        $this->joined_at = new DateTime('now', new DateTimeZone('UTC'));
    }
}
