import { ZERO_ADDRESS } from '../utils';
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { BigNumberish, Signature, utils } from 'ethers';

const { getAddress, verifyTypedData, hexlify, joinSignature, splitSignature } = utils;

export interface TypedDataConfig {
  address: string;
  version: string;
  chainId: number;
}

export interface DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface TypedDataParams {
  types: string[];
  values: unknown[];
}

export interface TypedData {
  name: string;
  type:
    | 'bool'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'uint128'
    | 'uint256'
    | 'address'
    | 'string'
    | 'bytes'
    | 'bytes32';
}

export interface EIP712DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface EIP712MessageTypes {
  [additionalProperties: string]: TypedData[];
}

export type EIP712Params = {
  nonce?: BigNumberish;
};

export interface EIP712TypedData<T extends EIP712MessageTypes, P extends EIP712Params> {
  domain: EIP712DomainTypedData;
  primaryType: keyof T;
  types: T;
  message: P;
}

export type EIP712Request<T extends EIP712MessageTypes, P extends EIP712Params> = EIP712TypedData<T, P> & Signature;

export abstract class TypedDataHandler {
  protected config: TypedDataConfig;

  public constructor(config: TypedDataConfig) {
    this.config = config;
  }

  abstract getDomainSeparator(): string;
  abstract getDomainTypedData(): DomainTypedData;

  public async signTypedDataRequest<T extends EIP712MessageTypes, P extends EIP712Params>(
    params: P,
    types: EIP712TypedData<T, P>,
    signer: TypedDataSigner
  ): Promise<EIP712Request<T, P>> {
    const rawSignature = await signer._signTypedData(types.domain, types.types, params);

    return { ...types, ...splitSignature(rawSignature) };
  }

  public verifyTypedDataRequestSignature<T extends EIP712MessageTypes, P extends EIP712Params>(
    attester: string,
    request: EIP712Request<T, P>
  ): boolean {
    if (attester === ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const sig = joinSignature({ v: request.v, r: hexlify(request.r), s: hexlify(request.s) });
    const recoveredAddress = verifyTypedData(request.domain, request.types, request.message, sig);

    return getAddress(attester) === getAddress(recoveredAddress);
  }
}
