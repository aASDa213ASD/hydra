<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Controller\V1\User;

use App\Application\User\DTO\AuthenticateUserInput;
use App\Application\User\Exception\InvalidCredentials;
use App\Application\User\Exception\UserNotFoundException;
use App\Application\User\UseCase\AuthenticateUser;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use InvalidArgumentException;

final class AuthController extends AbstractController
{
    public function __construct(
        private readonly AuthenticateUser $auth
    ) {}

    #[Route('/api/v1/login', name: 'api_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        try {
            $input = AuthenticateUserInput::fromHttpRequest($request);
            $result = $this->auth->handle($input);
        }
        catch (InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
        catch (UserNotFoundException | InvalidCredentials $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'token' => $result->token,
        ]);
    }

    #[Route('/api/v1/logout', name: 'api_logout', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function logout(): JsonResponse
    {
        return $this->json(['message' => 'LOGGED_OUT'], Response::HTTP_OK);
    }
}
