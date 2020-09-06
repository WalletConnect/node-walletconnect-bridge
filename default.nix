with import <nixpkgs> {};
pkgs.mkShell rec {
  name = "node-default";
  buildInputs = [ pkgs.nodejs-12_x ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}
