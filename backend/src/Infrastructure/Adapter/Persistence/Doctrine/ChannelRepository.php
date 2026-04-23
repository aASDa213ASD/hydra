<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Persistence\Doctrine;

use App\Core\Channel\Identity\Channel;
use App\Core\Channel\Storage\ChannelRepositoryInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Channel> */
final class ChannelRepository extends ServiceEntityRepository implements ChannelRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Channel::class);
    }

    public function save(Channel $channel): void
    {
        $em = $this->getEntityManager();
        $em->persist($channel);
        $em->flush();
    }

    public function findByName(string $name): ?Channel
    {
        $channel = $this->findOneBy(['name' => $name]);

        return $channel instanceof Channel ? $channel : null;
    }

    public function findById(int $id): ?Channel
    {
        $channel = $this->find($id);

        return $channel instanceof Channel ? $channel : null;
    }
}
