// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PropertyRegistry {
    struct Property {
        uint256 propertyId;
        string surveyNumber;
        string geoCoordinates;
        address ownerWalletAddress;
        string documentHash;
        uint256 timestamp;
        bool exists;
    }

    struct PropertyTransaction {
        string action;
        address from;
        address to;
        string documentHash;
        uint256 timestamp;
        uint256 blockNumber;
    }

    address public registrar;
    mapping(uint256 => Property) private properties;
    mapping(uint256 => PropertyTransaction[]) private transactionHistory;
    mapping(bytes32 => bool) private surveyUsed;

    event PropertyRegistered(
        uint256 indexed propertyId,
        string surveyNumber,
        address indexed owner,
        string documentHash,
        uint256 timestamp
    );

    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed oldOwner,
        address indexed newOwner,
        string documentHash,
        uint256 timestamp,
        string transferType
    );

    event PropertyMutated(
        uint256 indexed propertyId,
        address indexed owner,
        string oldDocumentHash,
        string newDocumentHash,
        uint256 timestamp
    );

    modifier onlyRegistrar() {
        require(msg.sender == registrar, "Only registrar");
        _;
    }

    modifier onlyPropertyOwner(uint256 propertyId) {
        require(properties[propertyId].exists, "Property not found");
        require(properties[propertyId].ownerWalletAddress == msg.sender, "Not property owner");
        _;
    }

    constructor() {
        registrar = msg.sender;
    }

    function setRegistrar(address newRegistrar) external onlyRegistrar {
        require(newRegistrar != address(0), "Invalid registrar");
        registrar = newRegistrar;
    }

    function registerProperty(
        uint256 propertyId,
        string memory surveyNumber,
        string memory geoCoordinates,
        address ownerWalletAddress,
        string memory documentHash
    ) external onlyRegistrar {
        require(propertyId != 0, "Invalid property ID");
        require(!properties[propertyId].exists, "Property already exists");
        require(ownerWalletAddress != address(0), "Invalid owner");
        bytes32 surveyKey = keccak256(abi.encodePacked(surveyNumber));
        require(!surveyUsed[surveyKey], "Survey number already used");

        properties[propertyId] = Property({
            propertyId: propertyId,
            surveyNumber: surveyNumber,
            geoCoordinates: geoCoordinates,
            ownerWalletAddress: ownerWalletAddress,
            documentHash: documentHash,
            timestamp: block.timestamp,
            exists: true
        });
        surveyUsed[surveyKey] = true;

        transactionHistory[propertyId].push(
            PropertyTransaction({
                action: "REGISTER",
                from: address(0),
                to: ownerWalletAddress,
                documentHash: documentHash,
                timestamp: block.timestamp,
                blockNumber: block.number
            })
        );

        emit PropertyRegistered(propertyId, surveyNumber, ownerWalletAddress, documentHash, block.timestamp);
    }

    function transferOwnership(
        uint256 propertyId,
        address newOwner,
        string memory newDocumentHash
    ) external onlyPropertyOwner(propertyId) {
        _transfer(propertyId, newOwner, newDocumentHash, "SALE");
    }

    function inheritProperty(
        uint256 propertyId,
        address beneficiary,
        string memory inheritanceDocumentHash
    ) external onlyRegistrar {
        require(properties[propertyId].exists, "Property not found");
        _transfer(propertyId, beneficiary, inheritanceDocumentHash, "INHERITANCE");
    }

    function mutateProperty(
        uint256 propertyId,
        string memory updatedDocumentHash
    ) external onlyPropertyOwner(propertyId) {
        Property storage property = properties[propertyId];
        string memory oldDocumentHash = property.documentHash;
        property.documentHash = updatedDocumentHash;

        transactionHistory[propertyId].push(
            PropertyTransaction({
                action: "MUTATION",
                from: property.ownerWalletAddress,
                to: property.ownerWalletAddress,
                documentHash: updatedDocumentHash,
                timestamp: block.timestamp,
                blockNumber: block.number
            })
        );

        emit PropertyMutated(propertyId, property.ownerWalletAddress, oldDocumentHash, updatedDocumentHash, block.timestamp);
    }

    function verifyOwnership(uint256 propertyId, address claimant) external view returns (bool) {
        if (!properties[propertyId].exists) {
            return false;
        }
        return properties[propertyId].ownerWalletAddress == claimant;
    }

    function getProperty(uint256 propertyId) external view returns (Property memory) {
        require(properties[propertyId].exists, "Property not found");
        return properties[propertyId];
    }

    function getPropertyHistory(uint256 propertyId) external view returns (PropertyTransaction[] memory) {
        require(properties[propertyId].exists, "Property not found");
        return transactionHistory[propertyId];
    }

    function _transfer(
        uint256 propertyId,
        address newOwner,
        string memory newDocumentHash,
        string memory transferType
    ) internal {
        require(newOwner != address(0), "Invalid new owner");
        Property storage property = properties[propertyId];
        address previousOwner = property.ownerWalletAddress;

        property.ownerWalletAddress = newOwner;
        property.documentHash = newDocumentHash;

        transactionHistory[propertyId].push(
            PropertyTransaction({
                action: transferType,
                from: previousOwner,
                to: newOwner,
                documentHash: newDocumentHash,
                timestamp: block.timestamp,
                blockNumber: block.number
            })
        );

        emit OwnershipTransferred(
            propertyId,
            previousOwner,
            newOwner,
            newDocumentHash,
            block.timestamp,
            transferType
        );
    }
}
