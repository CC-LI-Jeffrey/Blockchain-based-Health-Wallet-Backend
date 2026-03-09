// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  VaccineGroth16Verifier
//  Auto-generated constants from VaccineVerify.circom via snarkJS
//  DO NOT edit the curve constants below.
//
//  Circuit public signals (3 total):
//    [0] = isVaccinated  (output, always 1)
//    [1] = commitment    (poseidon(vaccinationId, vaccineName, salt))
//    [2] = targetVaccine (vaccine integer code)
// ============================================================
contract VaccineGroth16Verifier {
    uint256 constant r  = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 constant q  = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint256 constant alphax  = 6292748866740156383278934603562899437220855671083194355178909688307445812321;
    uint256 constant alphay  = 8804407489043322461571050883940134586097931688946528538916332296741494692705;
    uint256 constant betax1  = 2239029851410950618641036847306782331497542193157841364453609130969623670077;
    uint256 constant betax2  = 21830893302736794455333098750668191178150038279217179074090418223198778140955;
    uint256 constant betay1  = 4364786949037099392876506437102540182967310020236621773991659526363029472708;
    uint256 constant betay2  = 20608725078074919373295390840268892754546145509792486468523241473096128595019;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 13521894958914852688249702919707536062688543206601030787568448769053337552643;
    uint256 constant deltax2 = 17924112941708737211261951761604318482718172164116351671755517018613109221801;
    uint256 constant deltay1 = 17957287981883051102725774609225546235833561096210108855369468434872981984376;
    uint256 constant deltay2 = 19670923027246061510701316187579544703995092015202505251510449377733858915255;

    uint256 constant IC0x = 4853641769129072016361319327490128164148996388092742859823094312621346041457;
    uint256 constant IC0y = 17282793641960348952190684082013244629372775842597551149522739307138344217900;
    uint256 constant IC1x = 20829223205344677533632343945458777577844262618518160303904292951808984643787;
    uint256 constant IC1y = 3578361978353770227111117527621691502414934679384917110635333247151072295168;
    uint256 constant IC2x = 17423887039338351116028985688326302330144232957371814067381392486425950428731;
    uint256 constant IC2y = 21128522286639359611547318197435356470426481426499464968068679297929367302239;
    uint256 constant IC3x = 3948558850409160604142439547892757782323177563325653588281333055860559807237;
    uint256 constant IC3y = 11142259659378798635750448820220030871090097616197765826389562267275615164553;

    uint16 constant pVk      = 0;
    uint16 constant pPairing = 128;
    uint16 constant pLastMem = 832;  // 128 + 3*32*2 + 32*8 = 128 + 192 + 256 = 576 ... use 832 safely

    function verifyProof(
        uint[2]    calldata _pA,
        uint[2][2] calldata _pB,
        uint[2]    calldata _pC,
        uint[3]    calldata _pubSignals
    ) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)
                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))
                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)
                if iszero(success) { mstore(0, 0) return(0, 0x20) }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk      := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Accumulate: vk = IC0 + signal[0]*IC1 + signal[1]*IC2 + signal[2]*IC3
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))

                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))
                mstore(add(_pPairing, 64),  calldataload(pB))
                mstore(add(_pPairing, 96),  calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)

                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)
                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            checkField(calldataload(add(_pubSignals, 0)))
            checkField(calldataload(add(_pubSignals, 32)))
            checkField(calldataload(add(_pubSignals, 64)))

            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)
            mstore(0, isValid)
            return(0, 0x20)
        }
    }
}

// ============================================================
//  VaccineVerifyExtension
//
//  Two-step flow:
//    1. registerVaccineCommitment(commitment) — called once when adding a
//       vaccination record to store poseidon(vaccinationId, vaccineName, salt)
//    2. submitVaccineProof(a, b, c, input[3]) — submit ZK proof to mark
//       the user as vaccinated for a specific vaccine
//
//  Query:
//    isVaccinatedFor(address, vaccineCode) → bool
//
//  Vaccine integer codes (1-14, same as VaccineVerify.circom and Kotlin):
//    1=COVID-19, 2=Influenza, 3=HepatitisB, 4=HepatitisA, 5=MMR,
//    6=Varicella, 7=HPV, 8=Tetanus, 9=Pneumococcal, 10=Meningococcal,
//    11=Rabies, 12=YellowFever, 13=Typhoid, 14=Other
// ============================================================
contract VaccineVerifyExtension {

    VaccineGroth16Verifier public immutable verifier;

    /// user → commitment (poseidon hash registered at record creation time)
    mapping(address => mapping(uint256 => uint256)) public vaccineCommitments;

    /// user → vaccineCode → verified
    mapping(address => mapping(uint256 => bool)) public isVaccinatedFor;

    /// user → vaccineCode → verification timestamp
    mapping(address => mapping(uint256 => uint256)) public vaccinationVerifiedAt;

    event VaccineCommitmentRegistered(address indexed user, uint256 commitment, uint256 timestamp);
    event VaccinationVerified(address indexed user, uint256 vaccineCode, uint256 timestamp);

    constructor() {
        verifier = new VaccineGroth16Verifier();
    }

    /**
     * @dev Register a Poseidon commitment for a vaccination record.
     *      Call this immediately after adding a vaccination record.
     *      commitment = poseidon(vaccinationId, vaccineName, salt) — computed on-device
     * @param commitment  The Poseidon hash to register on-chain
     */
    function registerVaccineCommitment(uint256 commitment) external {
        require(commitment != 0, "Commitment cannot be zero");
        // Allow any non-zero index slot; use commitment itself as the key
        // so proof can reference it uniquely
        vaccineCommitments[msg.sender][commitment] = commitment;
        emit VaccineCommitmentRegistered(msg.sender, commitment, block.timestamp);
    }

    /**
     * @dev Submit a ZK proof to prove vaccination for a specific vaccine.
     * @param a      Groth16 proof component A
     * @param b      Groth16 proof component B
     * @param c      Groth16 proof component C
     * @param input  Public signals:
     *                 [0] = isVaccinated  (must be 1)
     *                 [1] = commitment    (must be registered by msg.sender)
     *                 [2] = targetVaccine (1-14)
     */
    function submitVaccineProof(
        uint[2]    calldata a,
        uint[2][2] calldata b,
        uint[2]    calldata c,
        uint[3]    calldata input
    ) external {
        require(input[0] == 1, "Proof: isVaccinated must be 1");
        require(input[2] >= 1 && input[2] <= 14, "Proof: invalid vaccine code (1-14)");

        // Verify the commitment was registered by this user
        require(
            vaccineCommitments[msg.sender][input[1]] == input[1],
            "Commitment not registered for this address"
        );

        require(verifier.verifyProof(a, b, c, input), "Invalid ZK proof");

        uint256 vaccineCode = input[2];
        isVaccinatedFor[msg.sender][vaccineCode] = true;
        vaccinationVerifiedAt[msg.sender][vaccineCode] = block.timestamp;

        emit VaccinationVerified(msg.sender, vaccineCode, block.timestamp);
    }

    /**
     * @dev Check if a user has a verified vaccine proof for a specific vaccine code.
     */
    function checkVaccinationStatus(address user, uint256 vaccineCode)
        external view returns (bool)
    {
        return isVaccinatedFor[user][vaccineCode];
    }

    /**
     * @dev Get full vaccination verification details.
     */
    function getVaccinationDetails(address user, uint256 vaccineCode)
        external view returns (bool verified, uint256 timestamp)
    {
        return (
            isVaccinatedFor[user][vaccineCode],
            vaccinationVerifiedAt[user][vaccineCode]
        );
    }

    /**
     * @dev Check if a commitment has been registered by a user.
     */
    function isCommitmentRegistered(address user, uint256 commitment)
        external view returns (bool)
    {
        return vaccineCommitments[user][commitment] == commitment;
    }
}
