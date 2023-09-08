import {
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    createKeypairFromFile,
} from './util';
import path from 'path';
import md5 from 'js-md5';


export async function main() {

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log(`Successfully connected to Solana dev net.`);

    const wallet = await createKeypairFromFile('signer.json');
    console.log(`Local account loaded successfully.`);

    const programKeypair = await createKeypairFromFile(
        path.join(
            path.resolve(__dirname, './dist/program'), 
            'program-keypair.json'
    ));
    const programId = programKeypair.publicKey;
    console.log(`Program ID: ${programId.toBase58()}`);

    const mintKeypair: Keypair = Keypair.generate();
    console.log(`New token: ${mintKeypair.publicKey}`);

    const SEED = md5(mintKeypair.publicKey.toBase58() + 'metadata');
    let metadataPubKey = await PublicKey.createWithSeed(
        wallet.publicKey,
        SEED,
        programId,
    );
    console.log(`The metadata address is:`);
    console.log(`   ${metadataPubKey.toBase58()}`);


    const transaction = new Transaction().add(
        SystemProgram.createAccountWithSeed({
            fromPubkey: wallet.publicKey,
            basePubkey: wallet.publicKey,
            seed: SEED,
            newAccountPubkey: metadataPubKey,
            lamports: LAMPORTS_PER_SOL / 10,
            space: 512,
            programId,
        }),
    );
    await sendAndConfirmTransaction(connection, transaction, [wallet]);

    console.log(`metadata account created successfully.`);

    // Transact with our program

    const instruction = new TransactionInstruction({
        keys: [
            // Mint account
            {
                pubkey: mintKeypair.publicKey,
                isSigner: true,
                isWritable: true,
            },
            // Mint Authority
            {
                pubkey: wallet.publicKey,
                isSigner: true,
                isWritable: false,
            },
            // Rent account
            {
                pubkey: SYSVAR_RENT_PUBKEY,
                isSigner: false,
                isWritable: false,
            },
            // System program
            {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false,
            },
            // Token program
            {
                pubkey: TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
            },
            // Metadata account
            {
                pubkey: metadataPubKey,
                isSigner: false,
                isWritable: true,
            },
        ],
        programId: programId,
        data: Buffer.from(JSON.stringify({
            icon: "icon",
            name: "name",
            symbol: "symbol",
            home: "home"
        })),
    })
    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        [wallet, mintKeypair],
    )
}

main().then(
    () => process.exit(),
    err => {
      console.error(err);
      process.exit(-1);
    },
  );