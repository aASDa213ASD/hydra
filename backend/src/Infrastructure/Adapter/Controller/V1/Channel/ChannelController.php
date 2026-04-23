<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Controller\V1\Channel;

use App\Application\Channel\DTO\ChannelNameInput;
use App\Application\Channel\Exception\ChannelAlreadyExistsException;
use App\Application\Channel\Exception\ChannelNotFoundException;
use App\Application\Channel\UseCase\CreateChannel;
use App\Application\Channel\UseCase\JoinChannel;
use App\Core\User\Identity\User;
use InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class ChannelController extends AbstractController
{
    public function __construct(
        private readonly CreateChannel $create_channel,
        private readonly JoinChannel $join_channel,
    ) {}

    #[Route(path: '/api/v1/channel/create', name: 'api_channel_create', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'NOT_USER_INSTANCE'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $input = ChannelNameInput::fromHttpRequest($request);
            $channel = $this->create_channel->handle($user, $input);
        } catch (InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (ChannelAlreadyExistsException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_CONFLICT);
        }

        return $this->json([
            'ok' => true,
            'channel' => $channel->toArray(),
        ]);
    }

    #[Route(path: '/api/v1/channel/join', name: 'api_channel_join', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function join(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'NOT_USER_INSTANCE'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $input = ChannelNameInput::fromHttpRequest($request);
            $channel = $this->join_channel->handle($user, $input);
        } catch (InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (ChannelNotFoundException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'ok' => true,
            'channel' => $channel->toArray(),
        ]);
    }
}
