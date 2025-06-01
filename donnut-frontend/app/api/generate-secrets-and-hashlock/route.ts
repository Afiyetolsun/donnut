import { NextResponse } from 'next/server';
import { HashLock } from '@1inch/cross-chain-sdk';
import { hexlify, randomBytes } from 'ethers';

interface GenerateSecretsRequestBody {
  secretsCount: number;
}

export async function POST(request: Request) {
  try {
    const { secretsCount }: GenerateSecretsRequestBody = await request.json();

    if (typeof secretsCount !== 'number' || secretsCount < 0) {
      return NextResponse.json(
        { error: 'Invalid secretsCount provided' },
        { status: 400 }
      );
    }

    const secrets: string[] = Array.from({ length: secretsCount }).map(() =>
      hexlify(randomBytes(32))
    );
    const secretHashes = secrets.map((s) => HashLock.hashSecret(s));
    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

    // Convert BigInts to strings before sending the response
    const serializableResponse = JSON.parse(JSON.stringify({ secrets, secretHashes, hashLock }, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value // return everything else unchanged
    ));
    return NextResponse.json(serializableResponse);
  } catch (error) {
    console.error('Error generating secrets and hashLock on backend:', error);
    return NextResponse.json(
      { error: `Failed to generate secrets and hashLock: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
