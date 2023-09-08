cargo build-bpf --manifest-path=program/Cargo.toml --bpf-out-dir=./dist/program
solana program deploy dist/program/program.so --keypair signer.json