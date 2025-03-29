pragma circom 2.0.0;

template TopArtists() {
    signal input artist1Hash;
    signal input artist2Hash;
    signal input artist3Hash;

    signal output out1;
    signal output out2;
    signal output out3;

    out1 <== artist1Hash;
    out2 <== artist2Hash;
    out3 <== artist3Hash;
}

component main = TopArtists();
