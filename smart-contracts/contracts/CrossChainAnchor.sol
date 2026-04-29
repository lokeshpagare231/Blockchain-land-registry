// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CrossChainAnchor {
    struct Proof {
        bytes32 proofHash;
        uint256 sourceChainId;
        uint256 sourceTimestamp;
        uint256 nonce;
        address relayer;
        uint256 anchoredAt;
    }

    mapping(bytes32 => Proof) private proofs;
    mapping(uint256 => bool) public usedNonces;

    event CrossChainProofAnchored(
        bytes32 indexed ethTxHash,
        bytes32 indexed proofHash,
        uint256 sourceChainId,
        uint256 nonce,
        address indexed relayer
    );

    error ProofAlreadyAnchored();
    error NonceAlreadyUsed();
    error InvalidHash();

    function anchorProof(
        bytes32 ethTxHash,
        bytes32 proofHash,
        uint256 sourceChainId,
        uint256 sourceTimestamp,
        uint256 nonce
    ) external {
        if (ethTxHash == bytes32(0) || proofHash == bytes32(0)) {
            revert InvalidHash();
        }

        if (proofs[ethTxHash].anchoredAt != 0) {
            revert ProofAlreadyAnchored();
        }

        if (usedNonces[nonce]) {
            revert NonceAlreadyUsed();
        }

        usedNonces[nonce] = true;
        proofs[ethTxHash] = Proof({
            proofHash: proofHash,
            sourceChainId: sourceChainId,
            sourceTimestamp: sourceTimestamp,
            nonce: nonce,
            relayer: msg.sender,
            anchoredAt: block.timestamp
        });

        emit CrossChainProofAnchored(ethTxHash, proofHash, sourceChainId, nonce, msg.sender);
    }

    function getProof(bytes32 ethTxHash) external view returns (Proof memory) {
        return proofs[ethTxHash];
    }
}
