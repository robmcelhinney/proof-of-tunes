pragma circom 2.0.0;

template TopArtists() {
    // Private inputs.
    signal input artist1Hash;
    signal input artist2Hash;
    signal input artist3Hash;

    // Public outputs.
    signal output artist1Pub;
    signal output artist2Pub;
    signal output artist3Pub;

    artist1Pub <== artist1Hash;
    artist2Pub <== artist2Hash;
    artist3Pub <== artist3Hash;
}

component main = TopArtists();
