<?php

declare(strict_types=1);

namespace App\Core\Channel\Identity;

use App\Core\User\Identity\User;
use App\Infrastructure\Adapter\Persistence\Doctrine\ChannelRepository;
use DateTime;
use DateTimeZone;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChannelRepository::class)]
#[ORM\Table(name: 'channels')]
#[ORM\UniqueConstraint(name: 'uniq_channels_name', columns: ['name'])]
#[ORM\HasLifecycleCallbacks]
class Channel
{
    #[ORM\Id]
    #[ORM\Column(name: 'id', type: Types::INTEGER)]
    #[ORM\GeneratedValue(strategy: 'AUTO')]
    public ?int $id = null {
        get => $this->id;
    }

    #[ORM\Column(type: Types::STRING, length: 32)]
    public string $name = '' {
        get => $this->name;
        set => $this->name = $value;
    }

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by_user_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    public ?User $created_by = null {
        get => $this->created_by;
        set => $this->created_by = $value;
    }

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $created_at = null {
        get => $this->created_at;
        set => $this->created_at = $value;
    }

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $updated_at = null {
        get => $this->updated_at;
        set => $this->updated_at = $value;
    }

    #[ORM\PrePersist]
    public function beforePersist(): void
    {
        $this->created_at = new DateTime('now', new DateTimeZone('UTC'));
    }

    #[ORM\PreUpdate]
    public function beforeUpdate(): void
    {
        $this->updated_at = new DateTime('now', new DateTimeZone('UTC'));
    }
}
