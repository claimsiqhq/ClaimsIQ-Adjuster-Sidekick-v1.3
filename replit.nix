{ pkgs }: {
  deps = [
    pkgs.imagemagick
    pkgs.jq
    pkgs.watchman
    pkgs.supabase-cli
  ];
}