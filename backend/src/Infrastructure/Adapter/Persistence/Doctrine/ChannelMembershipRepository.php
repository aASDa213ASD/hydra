<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Persistence\Doctrine;

use App\Core\Channel\Identity\Channel;
use App\Core\Channel\Identity\ChannelMembership;
use App\Core\Channel\Storage\ChannelMembershipRepositoryInterface;
use App\Core\User\Identity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<ChannelMembership> */
final class ChannelMembershipRepository extends ServiceEntityRepository implements ChannelMembershipRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ChannelMembership::class);
    }

    public function save(ChannelMembership $membership): void
    {
        $em = $this->getEntityManager();
        $em->persist($membership);
        $em->flush();
    }

    public function findByChannelAndUser(Channel $channel, User $user): ?ChannelMembership
    {
        $membership = $this->findOneBy(['channel' => $channel, 'user' => $user]);

        return $membership instanceof ChannelMembership ? $membership : null;
    }

    public function countByChannel(Channel $channel): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->where('m.channel = :channel')
            ->setParameter('channel', $channel)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function findChannelsByUser(User $user): array
    {
        $memberships = $this->findBy(['user' => $user]);

        $channels = [];
        foreach ($memberships as $membership) {
            if ($membership instanceof ChannelMembership && $membership->channel !== null) {
                $channels[] = $membership->channel;
            }
        }

        return $channels;
    }
}
