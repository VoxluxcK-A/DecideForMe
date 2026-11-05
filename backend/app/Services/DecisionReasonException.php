<?php

namespace App\Services;

use RuntimeException;

class DecisionReasonException extends RuntimeException
{
    public function __construct(string $message, public readonly int $statusCode, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
