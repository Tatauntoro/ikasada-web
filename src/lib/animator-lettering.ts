/**
 * Helper murni untuk preloader kartu judul animator: tulisan tangan satu
 * goresan dari font Hershey (domain publik), pena nib lebar, dan penanda waktu.
 *
 * Dua font ASCII 33–126 disimpan terkemas: satu glyph per "|", karakter
 * pertamanya setengah lebar, lalu goresan dipisah spasi berisi pasangan x,y.
 * Setiap nilai disimpan sebagai kode karakter dikurangi 50. Data dibangun
 * ulang dari paket `hersheytext` (MIT): "scripts" dan "futural".
 */

export type Glyph = { half: number; strokes: number[][] };

export type Laid = {
  strokes: number[][];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  lengths: number[];
};

export type LayoutOpts = {
  seed: number;
  jitter: number;
  condense: number;
  tracking: number;
  space: number;
  capGap: number;
};

export const ATP_SCRIPT =
  "8:3947@ :47@ :3;47@ 5F4G5H6G5F|;937: :37: B3@: C3@:|==/6O C/<O 6<D< 5BCB|=>/6L C/;L D7C8D9E8E7D5C4@3<39476788:9;@?BA 789:@>A?BABDAF@G=H9H6G5F4D4C5B6C5D|>G35H :3<5<7;99:7:58566483:3<4?5B5E4G3 CAAB@D@FBHDHFGGEGCEACA|?I;H<I=J<J;I:H:F;D=?E=G;H8H5G4E4C5A6@8?==?<A:B8B6A4?3=4<6<9=?>B@EBGDHFHGFGE 8H6G5E5C6A7@== <9=>>A@DBFDGFGGF|8:594:3;4;5:789|:A/=2:5886<5A5E6J7M8O =2:68:7=6B6G7L8O|9;/<1=4>9>==B;F9I6L2O ;/<2=7=<<A;D9H6L|;<3<? 76A< A67<|??6?H 6?H?|85H4G5F6G6H5J3L|?6?H?|77F6G7H8G7F|=J/0O|=>3;496796<5@5C6F7G9H;H>G@EBBC?D;D8C5B4@3>3 >3<4:6897<6@6C7F9H ;H=G?EABB?C;C8B5@3|=>79H @3:H @3=6:889 ?6;889|=97:899888795:4=3@3C4D6D8C:A<>>:@7B5D3H @3B4C6C8B:@<:@ 4F5E7E<G?GAFBD 7E<H?HAGBD|=97:899888795:4=3@3C4D6D8C:@<== @3B4C6C8B:@< ;===@>A?BABDAF@G=H9H6G5F4D4C5B6C5D ==?>@?AAAD@F?G=H|=B4<H C3=H C34BDB|=;36= ;3E3 ;4@4E3 6=7<:;=;@<A=B?BBAE?G<H9H6G5F4D4C5B6C5D =;?<@=A?AB@E>G<H|=C6B7C8D7D6C4A3>3;496796<5@5D6F7G9H<H?GAEBCB@A>@=><;<9=7?6A >3<4:6897<6@6E7G <H>G@EACA?@=|=8369 E3D6B9=?;B:D9H B9<?:B9D8H 76:3<3A6 85:4<4A6C6D5E3|==3:495878:9<;=>=B<C;D9D6C4@3=3 =3;4:5979::<;= >=A<B;C9C6B4@3 ;=7>5@4B4E5G8H<H@GAFBDBAA?@>>= ;=8>6@5B5E6G8H <H?G@FADA@@>|=C:B<@>>?;?9>8=7;7886:4=3@3B4C5D7D;C?BB@E>G;H8H6G5E5D6C7D6E 9>8<8896;4=3 B4C6C;B?AB?E=G;H|88:7;8<9;8: 5F4G5H6G|88:7;8<9;8: 5H4G5F6G6H5J3L|>F66?FH|?6<H< 6BHB|>66F?6H|=97:899888795:4=3A3D4E6E8D:C;==;>;@<A>A A3C4D6D8C:B;@< :F9G:H;G:F|@D;C9A8>8<9;::=:@;B=C@CBBC@ >8<:;=;@<B=C D8C@CBECGCIAJ>J<I9H7F5D4A3>3;49577695<5?6B7D9F;G>HAHDGFFGE E8D@DBEC|;2H4G7D:@>9A3AH@E>B<@9>7>6?6A7C9E<G?HDH|=?5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3D3F4G6G8F:E;C<@= ?=@=C>D?EAEDDFCGAH>H<G;E|<>9>:?;A;C:D8D6C4A3>3;496796;5?5C6F7G9H;H>G@EAC|>?3=4<6;::@9C8E6G4H2H1G1E2D4D6E8G;H>HAGCEEAF<F8E5D4B3?3=5=7>:@=B?EAGB|<@7@8A9C9D8D6C4@3<39486899;:<==:=7>6?5A5D6F7G:H=H@GBECC|<<9:9887684;3>3B4E4G3 B4@;>A<E:G8H6H4G3E3C4B6B8C ;=D=|>2H4G8C;><;=7=4<3;3:49699:;<<@<C;D:E8E>DCCEAG>H:H7G5E4C4A|>9:7967667493:3<4=6=8<<:B8F6H4H3G3E 9?B<D;G9I7J5J4I3H3F5D9B?ADAGBHCHEGFFHC|:@C>A<>;<:9:6;4<3>3?4@6@9?>=C<E:G8H6H4G3E3C4B6B8C|9<K:H8C7=7784:3<3=4>7>:=?:H8N7Q6S4T3S3Q4N6K8I;G?E|>9:7967667493:3<4=6=8<<:B8F6H4H3G3E J6J4I3H3F4D6B9@;><<< ><?>?E@GAHBHDGEFGC|<6?8?<>?<A:B8B5A3?3>4=6<;;@:C9E7G5H3H2G2E3D5D7E:G=H?HBGDE|A7:594746547383:4;6;8:=9A7H 9A<9>5?4A3B3D4E6E8D=CAAH CAF9H5I4K3L3N4O6O8N=LDLGMHNHPGQFSC|=7:594746547383:4;6;8:=9A7H 9A<9>5?4A3C3E4F6F8E=CDCGDHEHGGHFJC|=>3;496796;5?5C6F7G9H;H>G@EBBC@D<D8C5B4@3>3<5<8=;?>A@DBFC|??5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3F3H4I5J7J:I<H=F>C>A=@<|>?9>;=<;=9=8;8996;4>3A3C4D6D:C=A@=D:F8G5H3H2G2E3D5D7E:G=H@HCGEE|??5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3E3G4H5I7I:H<G=E>B>?=@>A@AEBGDHFGGFIC|<2H4G6E9A;>=:>7>4=3<3;4:6:8;:=<@>B@CBCDBFAG>H:H7G5E4C4A|;<9:9887684;3>3B4E4G3 B4@;>A<E:G8H6H4G3E3C4B6B8C|=7:594746547383:4;6;8:<9?8C8E9G;H=H?G@FBBE:G3 E:D>CDCGDHEHGGHFJC|=7:594746547383:4;6;8:<9?8C8F9H;H=G@DBAD=E:F6F4E3D3C4B6B8C;E=G>|?7:594746547383:4;6;9:H D3:H D3BH P3N4K7H;EABH|>:989787684:3<3>4?6?9=B=E>G@HBHDGEEECDBBB I6I4H3F3D4B6@9<B:E8G6H4H3G3E|=7:594746547383:4;6;8:<9?8C8E9G:H<H>G@EBBC@E: G3E:BD@J>O<S:T9S9Q:N<K?HBFGC|=?9>;=<;=9=8;8996;4>3A3C4D6D:C=AA>D:G8H5H4G4E5D8D:E;F<H<K;N:P8S6T5S5Q6N8K;H>FDC|96/6O 7/7O 6/=/ 6O=O|923@K|9;/;O </<O 5/</ 5O<O|:89:6<9 5<:7?< :7:H|:2JBJ|8;395878899:897|<;B:@8?6?4@3A2C2E3G5H7H9G:E<?;D;G<H=H?G@FBC|;2C4@7;8996948364564:3A3G4H5H7G9E:B:?;C<D>D@C|89A9@8?6?4@3A2C2E3G5H8H;F=C|<;B:@8?6?4@3A2C2E3G5H7H9G:E@3 <?;D;G<H=H?G@FBC|83F5E6D7B7@6?5?3@2B2E3G5H7H9G:F<C|72C6>8;99:6:49374664>1G.N-Q-S.T0S1P2G3H5H7G8F:C|;;B:@8?6?4@3A2C2E3G5H7H9G:F <?:F6Q5S3T2S2Q3N6K9I;H>FAC|<2C4@7;8996948364564:3@2H 2H3E4C6@8?:?;@;B:E:G;H<H>G?FAC|75:5;6;6:5: 2C4?2E2G3H4H6G7F9C|75:5;6;6:5: 2C4?.Q-S+T*S*Q+N.K1I3H6F9C|;2C4@7;8996948364564:3@2H 2H3E4C6@8?:?;@;B9C6C 6C8D9G:H;H=G>F@C|72C4@7;8996948364564:3A3G4H5H7G8F:C|>2C4@6?7@7A6E5H 6E7C9@;?=?>@>A=E<H =E>C@@B?D?E@EBDEDGEHFHHGIFKC|<2C4@6?7@7A6E5H 6E7C9@;?=?>@>B=E=G>H?HAGBFDC|:8?6?4@3A2C2E3G5H7H9G:F;D;B:@8?7@7B8D:E=E?D@C|:2C4@5>4B.T 4B5@7?9?;@<B<D;F:G8H 4G6H9H<G>FAC|;;B:@8?6?4@3A2C2E3G5H7H9G <?;B9G6N5Q5S6T8S9P9I;H>FAC|:2C4@5>5@8@9A9C8F8G9H:H<G=F?C|92C4@5>5@7C8E8G6H 2G4H8H:G;F=C|82C4@6< 933E3G4H6H8G9F;C 3;:;|;2C4?2E2G3H5H7G9E;B <?:E:G;H<H>G?FAC|;2C4?3D3G4H5H8G:E;B;? ;?<C=D?DAC|>5?3A2D2F3H5H7G9E ;?9E9G:H<H>G@EABA? A?BCCDEDGC|:2C4@6?8?9@9G:H=H@FBC ?@>?<?;@7G6H4H3G|;2C4?2E2G3H5H7G9E;B <?6Q5S3T2S2Q3N6K9I;H>FAC|:2C4@6?8?:A:C9E7G4H6I7K7N6Q5S3T2S2Q3N6K9I=F@C|9;/908173758798:::<8> 90828496:7;9;;:=6?:A;C;E:G9H8J8L9N 8@:B:D9F8G7I7K8M9N;O|66/6O|97/90:1;3;5:7988:8<:> 90:2:49687797;8=<?8A7C7E8G9H:J:L9N :@8B8D9F:G;I;K:M9N7O|>5B5@6=8<:<<=@@BADAF@G> 5@6>8=:=<>@ABBDBFAG>G<";
export const ATP_SANS =
  "7737A 7F6G7H8G7F|:636: >3>:|==/6O C/<O 6<D< 5BCB|<:/:L >/>L C6A4>3:37456586:7;9<?>A?B@CBCEAG>H:H7G5E|>G35H :3<5<7;99:7:58566483:3<4?5B5E4G3 CAAB@D@FBHDHFGGEGCEACA|?I<I;H:G:F;E=CBAE?G=H9H7G6F5D5B6@7?>;?:@8@6?4=3;4:6:8;;=>BEDGFHHHIGIF|775647384867869|9=/;194786=6A7F9J;M=O|95/7194;8<=<A;F9J7M5O|::9:E 5<?B ?<5B|??6?H 6?H?|67D6E5D6C7D7F5H|?6?H?|66C5D6E7D6C|=F/4O|<;384675<5?6D8G;H=H@GBDC?C<B7@4=3;3|<87:6=3=H|<68677584:3>3@4A5B7B9A;?>5HCH|<73B3<;?;A<B=C@CBBE@G=H:H7G6F5D|<?35ADA ?3?H|<A3736<7;::=:@;B=C@CBBE@G=H:H7G6F5D|<B6A4>3<394776<6A7E9G<H=H@GBECBCAB>@<=;<;9<7>6A|<C39H 53C3|<:37466687:9;=<@=B?CACDBFAG>H:H7G6F5D5A6?8=;<?;A:B8B6A4>3:3|<B:A=??<@;@8?6=5:596684;3<3?4A6B:B?AD?G<H:H7G6E|66<5=6>7=6< 6C5D6E7D6C|66<5=6>7=6< 7D6E5D6C7D7F5H|>F66?FH|?6<H< 6BHB|>66F?6H|;5857657493=3?4@5A7A9@;?<;>;A ;F:G;H<G;F|@D;C9A8>8<9;::=:@;B=C@CBBC@ >8<:;=;@<B=C D8C@CBECGCIAJ>J<I9H7F5D4A3>3;49577695<5?6B7D9F;G>HAHDGFFGE E8D@DBEC|;;33H ;3CH 6A@A|<636H 63?3B4C5D7D9C;B<?= 6=?=B>C?DADDCFBG?H6H|=D8C6A4?3;39476685;5@6C7E9G;H?HAGCEDC|<636H 63=3@4B6C8D;D@CCBE@G=H6H|;636H 63C3 6=>= 6HCH|:636H 63C3 6=>=|=D8C6A4?3;39476685;5@6C7E9G;H?HAGCEDCD@ ?@D@|=636H D3DH 6=D=|6636H|:>3>C=F<G:H8H6G5F4C4A|<636H D36A ;<DH|9636H 6HBH|>636H 63>H F3>H F3FH|=636H 63DH D3DH|=;39476685;5@6C7E9G;H?HAGCEDCE@E;D8C6A4?3;3|<636H 63?3B4C5D7D:C<B=?>6>|=;39476685;5@6C7E9G;H?HAGCEDCE@E;D8C6A4?3;3 >DDJ|<636H 63?3B4C5D7D9C;B<?=6= ==DH|<C6A4>3:37456586:7;9<?>A?B@CBCEAG>H:H7G5E|::3:H 33A3|=636B7E9G<H>HAGCEDBD3|;33;H C3;H|>439H >39H >3CH H3CH|<53CH C35H|;33;=;H C3;=|<C35H 53C3 5HCH|96/6O 7/7O 6/=/ 6O=O|923@K|9;/;O </<O 5/</ 5O<O|::12? :1B?|;2ODO|6785:5<6=7<6;5<|<A:AH A=?;=:::8;6=5@5B6E8G:H=H?GAE|;636H 6=8;::=:?;A=B@BBAE?G=H:H8G6E|;A=?;=:::8;6=5@5B6E8G:H=H?GAE|<A3AH A=?;=:::8;6=5@5B6E8G:H=H?GAE|;5@A@A>@<?;=:::8;6=5@5B6E8G:H=H?GAE|9<3:384777H 4:;:|<A:AJ@M?N=O:O8N A=?;=:::8;6=5@5B6E8G:H=H?GAE|<636H 6>9;;:>:@;A>AH|65364736253 6:6H|77384938273 8:8K7N5O3O|:636H @:6D :@AH|6636H|A6:6H 6>9;;:>:@;A>AH A>D;F:I:K;L>LH|<6:6H 6>9;;:>:@;A>AH|<::8;6=5@5B6E8G:H=H?GAEBBB@A=?;=:::|;6:6O 6=8;::=:?;A=B@BBAE?G=H:H8G6E|<A:AO A=?;=:::8;6=5@5B6E8G:H=H?GAE|86:6H 6@7=9;;:>:|;@=?;<:9:6;5=6?8@=A?B@D@E?G<H9H6G5E|9737D8G:H<H 4:;:|<6:6D7G9H<H>GAD A:AH|:4::H @::H|=5:9H =:9H =:AH E:AH|;5:@H @:5H|:4::H @::H8L6N4O3O|;@:5H 5:@: 5H@H|9;/908173758798:::<8> 90828496:7;9;;:=6?:A;C;E:G9H8J8L9N 8@:B:D9F8G7I7K8M9N;O|66/6O|97/90:1;3;5:7988:8<:> 90:2:49687797;8=<?8A7C7E8G9H:J:L9N :@8B8D9F:G;I;K:M9N7O|>5B5@6=8<:<<=@@BADAF@G> 5@6>8=:=<>@ABBDBFAG>G<";

/** PRNG kecil dan cepat (mulberry32): seed sama, goyangan sama. */
export function atpRandom(seed: number) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Font terkemas menjadi glyph, diindeks charCode - 33. */
export function atpDecode(data: string): Glyph[] {
  return data.split("|").map((g) => {
    const strokes = g
      .slice(1)
      .split(" ")
      .filter((s) => s.length > 1)
      .map((s) => {
        const pts: number[] = [];
        for (let i = 0; i + 1 < s.length; i += 2) pts.push(s.charCodeAt(i) - 50, s.charCodeAt(i + 1) - 50);
        return pts;
      });
    return { half: g.charCodeAt(0) - 50, strokes };
  });
}

/** True bila setiap karakter teks punya glyph (ASCII yang bisa dicetak). */
export function atpSupported(text: string) {
  return /^[\x20-\x7e]*$/.test(text);
}

/**
 * Tata satu baris teks menjadi goresan dalam satuan font (tinggi huruf besar
 * ≈ 21, garis dasar y = 22). Tiap glyph miring, berskala, dan bergeser sedikit,
 * tiap titik bergetar, sehingga baris terbaca ditulis tangan, bukan diketik.
 */
export function atpLayout(text: string, font: Glyph[], opts: LayoutOpts): Laid {
  const rand = atpRandom(opts.seed);
  const strokes: number[][] = [];
  let pen = 0;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ch of text) {
    const g = ch === " " ? null : font[ch.charCodeAt(0) - 33];
    if (!g || !g.strokes.length) {
      pen += opts.space;
      continue;
    }
    let gx0 = Infinity;
    let gx1 = -Infinity;
    for (const s of g.strokes) {
      for (let i = 0; i < s.length; i += 2) {
        gx0 = Math.min(gx0, s[i]);
        gx1 = Math.max(gx1, s[i]);
      }
    }
    const cx = (gx0 + gx1) / 2;
    const rot = (rand() - 0.5) * 0.07;
    const sc = 1 + (rand() - 0.5) * 0.07;
    const dy = (rand() - 0.5) * opts.jitter * 2.2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    for (const s of g.strokes) {
      const out: number[] = [];
      for (let i = 0; i < s.length; i += 2) {
        const lx = (s[i] - cx) * sc;
        const ly = (s[i + 1] - 14) * sc;
        const x = (pen + (cx - gx0) + lx * cos - ly * sin) * opts.condense + (rand() - 0.5) * opts.jitter;
        const y = 14 + lx * sin + ly * cos + dy + (rand() - 0.5) * opts.jitter;
        out.push(x, y);
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
      strokes.push(out);
    }
    pen += gx1 - gx0 + opts.tracking + (ch >= "A" && ch <= "Z" ? opts.capGap : 0);
  }
  if (!strokes.length) return { strokes, x0: 0, y0: 0, x1: 1, y1: 22, lengths: [] };
  const lengths = strokes.map((s) => {
    let l = 0;
    for (let i = 2; i < s.length; i += 2) l += Math.hypot(s[i] - s[i - 2], s[i + 1] - s[i - 1]);
    return l;
  });
  return { strokes, x0, y0, x1, y1, lengths };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Goresan pena nib lebar: satu jajar genjang per segmen, disapu nib berpaut
 * (nx, ny), semuanya searah sehingga fill nonzero menyatukannya menjadi satu
 * goresan kaligrafi yang tebal-tipis.
 */
export function atpNib(pts: number[], nx: number, ny: number) {
  let d = "";
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2];
    const ay = pts[i - 1];
    const bx = pts[i];
    const by = pts[i + 1];
    const cross = (bx - ax) * ny - (by - ay) * nx;
    const s = cross >= 0 ? 1 : -1;
    d +=
      "M" + r2(ax + nx * s) + " " + r2(ay + ny * s) +
      "L" + r2(bx + nx * s) + " " + r2(by + ny * s) +
      "L" + r2(bx - nx * s) + " " + r2(by - ny * s) +
      "L" + r2(ax - nx * s) + " " + r2(ay - ny * s) + "Z";
  }
  return d;
}

/** Garis titik-titik sebagai path. */
export function atpPath(pts: number[]) {
  let d = "";
  for (let i = 0; i < pts.length; i += 2) d += (i ? "L" : "M") + r2(pts[i]) + " " + r2(pts[i + 1]);
  return pts.length === 2 ? d + "l0.01 0" : d;
}

/** Kapan huruf i dari n di-ink dan dicat, dalam persen muat. */
export function atpBeats(i: number, n: number) {
  const k = n <= 1 ? 0 : i / (n - 1);
  return { ink: 34 + k * 38, paint: 50 + k * 40 };
}

/** Tahap produksi untuk persen muat: 0 sketsa, 1 tinta, 2 warna, 3 jadi. */
export function atpStage(pct: number) {
  return pct >= 100 ? 3 : pct >= 50 ? 2 : pct >= 34 ? 1 : 0;
}

/** Nomor frame HUD untuk persen muat, diisi nol sepanjang `frames`. */
export function atpFrame(pct: number, frames: number) {
  const total = Math.max(1, Math.round(frames));
  const f = Math.round((Math.max(0, Math.min(100, pct)) / 100) * total);
  const w = Math.max(4, String(total).length);
  return { frame: String(f).padStart(w, "0"), total: String(total).padStart(w, "0") };
}
