<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

class EncryptionService
{
    private string $key;

    public function __construct()
    {
        $appKey = config('app.key');
        if (str_starts_with($appKey, 'base64:')) {
            $appKey = base64_decode(substr($appKey, 7));
        }

        // Derive a separate key for MLS credential encryption using HKDF
        $this->key = hash_hkdf('sha256', $appKey, 32, 'idx-mls-credentials');
    }

    public function encrypt(string $plaintext): string
    {
        $iv = random_bytes(12); // 96-bit nonce for GCM
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            16
        );

        if ($ciphertext === false) {
            throw new RuntimeException('Encryption failed.');
        }

        // Format: base64(iv + tag + ciphertext)
        return base64_encode($iv . $tag . $ciphertext);
    }

    public function decrypt(string $encoded): string
    {
        $raw = base64_decode($encoded, true);

        if ($raw === false || strlen($raw) < 28) { // 12 (iv) + 16 (tag) = minimum 28
            throw new RuntimeException('Invalid encrypted data.');
        }

        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $ciphertext = substr($raw, 28);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $this->key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new RuntimeException('Decryption failed.');
        }

        return $plaintext;
    }
}
