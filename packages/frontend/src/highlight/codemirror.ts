import { basicSetup } from 'codemirror'
import { indentWithTab } from '@codemirror/commands'
import { HighlightStyle, LanguageDescription, LanguageSupport, StreamLanguage, syntaxHighlighting, syntaxTree } from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { highlightTree, tags } from '@lezer/highlight'

/** Wrap a legacy StreamParser as a LanguageSupport extension */
function legacy(parser: { startState: (...args: unknown[]) => unknown; token: (...args: unknown[]) => string | null }): LanguageSupport {
  return new LanguageSupport(StreamLanguage.define(parser as never))
}

const CDN_LEGACY = 'https://npm.webcache.cn/@codemirror/legacy-modes@6.5.2/mode/'

// Language descriptions with CDN-based loading
// Modern languages use bare imports resolved via import map
// Legacy languages load self-contained files from webcache CDN
const languages: readonly LanguageDescription[] = [
  // Modern languages (loaded via import map -> webcache CDN)
  LanguageDescription.of({ name: "C", extensions: ["c","h","ino"], load: () => import("@codemirror/lang-cpp").then(m => m.cpp()) }),
  LanguageDescription.of({ name: "C++", alias: ["cpp"], extensions: ["cpp","c++","cc","cxx","hpp","h++","hh","hxx"], load: () => import("@codemirror/lang-cpp").then(m => m.cpp()) }),
  LanguageDescription.of({ name: "CQL", alias: ["cassandra"], extensions: ["cql"], load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.Cassandra })) }),
  LanguageDescription.of({ name: "CSS", extensions: ["css"], load: () => import("@codemirror/lang-css").then(m => m.css()) }),
  LanguageDescription.of({ name: "Go", extensions: ["go"], load: () => import("@codemirror/lang-go").then(m => m.go()) }),
  LanguageDescription.of({ name: "HTML", alias: ["xhtml"], extensions: ["html","htm","handlebars","hbs"], load: () => import("@codemirror/lang-html").then(m => m.html()) }),
  LanguageDescription.of({ name: "Java", extensions: ["java"], load: () => import("@codemirror/lang-java").then(m => m.java()) }),
  LanguageDescription.of({ name: "JavaScript", alias: ["ecmascript","js","node"], extensions: ["js","mjs","cjs"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript()) }),
  LanguageDescription.of({ name: "Jinja", extensions: ["j2","jinja","jinja2"], load: () => import("@codemirror/lang-jinja").then(m => m.jinja()) }),
  LanguageDescription.of({ name: "JSON", alias: ["json5"], extensions: ["json","map"], load: () => import("@codemirror/lang-json").then(m => m.json()) }),
  LanguageDescription.of({ name: "JSX", extensions: ["jsx"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true })) }),
  LanguageDescription.of({ name: "LESS", extensions: ["less"], load: () => import("@codemirror/lang-less").then(m => m.less()) }),
  LanguageDescription.of({ name: "Liquid", extensions: ["liquid"], load: () => import("@codemirror/lang-liquid").then(m => m.liquid()) }),
  LanguageDescription.of({ name: "MariaDB SQL", load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.MariaSQL })) }),
  LanguageDescription.of({ name: "Markdown", extensions: ["md","markdown","mkd"], load: () => import("@codemirror/lang-markdown").then(m => m.markdown()) }),
  LanguageDescription.of({ name: "MS SQL", load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.MSSQL })) }),
  LanguageDescription.of({ name: "MySQL", load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.MySQL })) }),
  LanguageDescription.of({ name: "PHP", extensions: ["php","php3","php4","php5","php7","phtml"], load: () => import("@codemirror/lang-php").then(m => m.php()) }),
  LanguageDescription.of({ name: "PLSQL", extensions: ["pls"], load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.PLSQL })) }),
  LanguageDescription.of({ name: "PostgreSQL", load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.PostgreSQL })) }),
  LanguageDescription.of({ name: "Python", extensions: ["BUILD","bzl","py","pyw"], filename: /^(BUCK|BUILD)$/i, load: () => import("@codemirror/lang-python").then(m => m.python()) }),
  LanguageDescription.of({ name: "Rust", extensions: ["rs"], load: () => import("@codemirror/lang-rust").then(m => m.rust()) }),
  LanguageDescription.of({ name: "Sass", extensions: ["sass"], load: () => import("@codemirror/lang-sass").then(m => m.sass({ indented: true })) }),
  LanguageDescription.of({ name: "SCSS", extensions: ["scss"], load: () => import("@codemirror/lang-sass").then(m => m.sass()) }),
  LanguageDescription.of({ name: "SQL", extensions: ["sql"], load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.StandardSQL })) }),
  LanguageDescription.of({ name: "SQLite", load: () => import("@codemirror/lang-sql").then(m => m.sql({ dialect: m.SQLite })) }),
  LanguageDescription.of({ name: "TSX", extensions: ["tsx"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true, typescript: true })) }),
  LanguageDescription.of({ name: "TypeScript", alias: ["ts"], extensions: ["ts","mts","cts"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript({ typescript: true })) }),
  LanguageDescription.of({ name: "WebAssembly", extensions: ["wat","wast"], load: () => import("@codemirror/lang-wast").then(m => m.wast()) }),
  LanguageDescription.of({ name: "XML", alias: ["rss","wsdl","xsd"], extensions: ["xml","xsl","xsd","svg"], load: () => import("@codemirror/lang-xml").then(m => m.xml()) }),
  LanguageDescription.of({ name: "YAML", alias: ["yml"], extensions: ["yaml","yml"], load: () => import("@codemirror/lang-yaml").then(m => m.yaml()) }),
  LanguageDescription.of({ name: "Vue", extensions: ["vue"], load: () => import("@codemirror/lang-vue").then(m => m.vue()) }),
  LanguageDescription.of({ name: "Angular Template", load: () => import("@codemirror/lang-angular").then(m => m.angular()) }),
  // Legacy languages (self-contained files from webcache CDN)
  LanguageDescription.of({ name: "APL", extensions: ["dyalog","apl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "apl.js").then(m => legacy(m.apl)) }),
  LanguageDescription.of({ name: "PGP", alias: ["asciiarmor"], extensions: ["asc","pgp","sig"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "asciiarmor.js").then(m => legacy(m.asciiArmor)) }),
  LanguageDescription.of({ name: "ASN.1", extensions: ["asn","asn1"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "asn1.js").then(m => legacy(m.asn1)) }),
  LanguageDescription.of({ name: "Asterisk", filename: /^extensions\.conf$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "asterisk.js").then(m => legacy(m.asterisk)) }),
  LanguageDescription.of({ name: "Brainfuck", extensions: ["b","bf"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "brainfuck.js").then(m => legacy(m.brainfuck)) }),
  LanguageDescription.of({ name: "Cobol", extensions: ["cob","cpy"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "cobol.js").then(m => legacy(m.cobol)) }),
  LanguageDescription.of({ name: "C#", alias: ["csharp","cs"], extensions: ["cs"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.csharp)) }),
  LanguageDescription.of({ name: "Clojure", extensions: ["clj","cljc","cljx"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clojure.js").then(m => legacy(m.clojure)) }),
  LanguageDescription.of({ name: "ClojureScript", extensions: ["cljs"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clojure.js").then(m => legacy(m.clojure)) }),
  LanguageDescription.of({ name: "Closure Stylesheets (GSS)", extensions: ["gss"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "css.js").then(m => legacy(m.gss)) }),
  LanguageDescription.of({ name: "CMake", extensions: ["cmake","cmake.in"], filename: /^CMakeLists\.txt$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "cmake.js").then(m => legacy(m.cmake)) }),
  LanguageDescription.of({ name: "CoffeeScript", alias: ["coffee","coffee-script"], extensions: ["coffee"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "coffeescript.js").then(m => legacy(m.coffeeScript)) }),
  LanguageDescription.of({ name: "Common Lisp", alias: ["lisp"], extensions: ["cl","lisp","el"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "commonlisp.js").then(m => legacy(m.commonLisp)) }),
  LanguageDescription.of({ name: "Cypher", extensions: ["cyp","cypher"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "cypher.js").then(m => legacy(m.cypher)) }),
  LanguageDescription.of({ name: "Cython", extensions: ["pyx","pxd","pxi"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "python.js").then(m => legacy(m.cython)) }),
  LanguageDescription.of({ name: "Crystal", extensions: ["cr"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "crystal.js").then(m => legacy(m.crystal)) }),
  LanguageDescription.of({ name: "D", extensions: ["d"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "d.js").then(m => legacy(m.d)) }),
  LanguageDescription.of({ name: "Dart", extensions: ["dart"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.dart)) }),
  LanguageDescription.of({ name: "diff", extensions: ["diff","patch"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "diff.js").then(m => legacy(m.diff)) }),
  LanguageDescription.of({ name: "Dockerfile", filename: /^Dockerfile$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "dockerfile.js").then(m => legacy(m.dockerFile)) }),
  LanguageDescription.of({ name: "DTD", extensions: ["dtd"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "dtd.js").then(m => legacy(m.dtd)) }),
  LanguageDescription.of({ name: "Dylan", extensions: ["dylan","dyl","intr"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "dylan.js").then(m => legacy(m.dylan)) }),
  LanguageDescription.of({ name: "EBNF", load: () => import(/* @vite-ignore */ CDN_LEGACY + "ebnf.js").then(m => legacy(m.ebnf)) }),
  LanguageDescription.of({ name: "ECL", extensions: ["ecl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "ecl.js").then(m => legacy(m.ecl)) }),
  LanguageDescription.of({ name: "edn", extensions: ["edn"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clojure.js").then(m => legacy(m.clojure)) }),
  LanguageDescription.of({ name: "Eiffel", extensions: ["e"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "eiffel.js").then(m => legacy(m.eiffel)) }),
  LanguageDescription.of({ name: "Elm", extensions: ["elm"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "elm.js").then(m => legacy(m.elm)) }),
  LanguageDescription.of({ name: "Erlang", extensions: ["erl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "erlang.js").then(m => legacy(m.erlang)) }),
  LanguageDescription.of({ name: "Esper", load: () => import(/* @vite-ignore */ CDN_LEGACY + "sql.js").then(m => legacy(m.esper)) }),
  LanguageDescription.of({ name: "Factor", extensions: ["factor"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "factor.js").then(m => legacy(m.factor)) }),
  LanguageDescription.of({ name: "FCL", load: () => import(/* @vite-ignore */ CDN_LEGACY + "fcl.js").then(m => legacy(m.fcl)) }),
  LanguageDescription.of({ name: "Forth", extensions: ["forth","fth","4th"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "forth.js").then(m => legacy(m.forth)) }),
  LanguageDescription.of({ name: "Fortran", extensions: ["f","for","f77","f90","f95"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "fortran.js").then(m => legacy(m.fortran)) }),
  LanguageDescription.of({ name: "F#", alias: ["fsharp"], extensions: ["fs"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mllike.js").then(m => legacy(m.fSharp)) }),
  LanguageDescription.of({ name: "Gas", extensions: ["s"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "gas.js").then(m => legacy(m.gas)) }),
  LanguageDescription.of({ name: "Gherkin", extensions: ["feature"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "gherkin.js").then(m => legacy(m.gherkin)) }),
  LanguageDescription.of({ name: "Groovy", extensions: ["groovy","gradle"], filename: /^Jenkinsfile$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "groovy.js").then(m => legacy(m.groovy)) }),
  LanguageDescription.of({ name: "Haskell", extensions: ["hs"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "haskell.js").then(m => legacy(m.haskell)) }),
  LanguageDescription.of({ name: "Haxe", extensions: ["hx"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "haxe.js").then(m => legacy(m.haxe)) }),
  LanguageDescription.of({ name: "HXML", extensions: ["hxml"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "haxe.js").then(m => legacy(m.hxml)) }),
  LanguageDescription.of({ name: "HTTP", load: () => import(/* @vite-ignore */ CDN_LEGACY + "http.js").then(m => legacy(m.http)) }),
  LanguageDescription.of({ name: "IDL", extensions: ["pro"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "idl.js").then(m => legacy(m.idl)) }),
  LanguageDescription.of({ name: "JSON-LD", alias: ["jsonld"], extensions: ["jsonld"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "javascript.js").then(m => legacy(m.jsonld)) }),
  LanguageDescription.of({ name: "Julia", extensions: ["jl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "julia.js").then(m => legacy(m.julia)) }),
  LanguageDescription.of({ name: "Kotlin", extensions: ["kt","kts"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.kotlin)) }),
  LanguageDescription.of({ name: "LiveScript", alias: ["ls"], extensions: ["ls"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "livescript.js").then(m => legacy(m.liveScript)) }),
  LanguageDescription.of({ name: "Lua", extensions: ["lua"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "lua.js").then(m => legacy(m.lua)) }),
  LanguageDescription.of({ name: "mIRC", extensions: ["mrc"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mirc.js").then(m => legacy(m.mirc)) }),
  LanguageDescription.of({ name: "Mathematica", extensions: ["m","nb","wl","wls"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mathematica.js").then(m => legacy(m.mathematica)) }),
  LanguageDescription.of({ name: "Modelica", extensions: ["mo"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "modelica.js").then(m => legacy(m.modelica)) }),
  LanguageDescription.of({ name: "MUMPS", extensions: ["mps"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mumps.js").then(m => legacy(m.mumps)) }),
  LanguageDescription.of({ name: "Mbox", extensions: ["mbox"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mbox.js").then(m => legacy(m.mbox)) }),
  LanguageDescription.of({ name: "Nginx", filename: /nginx.*\.conf$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "nginx.js").then(m => legacy(m.nginx)) }),
  LanguageDescription.of({ name: "NSIS", extensions: ["nsh","nsi"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "nsis.js").then(m => legacy(m.nsis)) }),
  LanguageDescription.of({ name: "NTriples", extensions: ["nt","nq"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "ntriples.js").then(m => legacy(m.ntriples)) }),
  LanguageDescription.of({ name: "Objective-C", alias: ["objective-c","objc"], extensions: ["m"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.objectiveC)) }),
  LanguageDescription.of({ name: "Objective-C++", alias: ["objective-c++","objc++"], extensions: ["mm"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.objectiveCpp)) }),
  LanguageDescription.of({ name: "OCaml", extensions: ["ml","mli","mll","mly"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mllike.js").then(m => legacy(m.oCaml)) }),
  LanguageDescription.of({ name: "Octave", extensions: ["m"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "octave.js").then(m => legacy(m.octave)) }),
  LanguageDescription.of({ name: "Oz", extensions: ["oz"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "oz.js").then(m => legacy(m.oz)) }),
  LanguageDescription.of({ name: "Pascal", extensions: ["p","pas"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "pascal.js").then(m => legacy(m.pascal)) }),
  LanguageDescription.of({ name: "Perl", extensions: ["pl","pm"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "perl.js").then(m => legacy(m.perl)) }),
  LanguageDescription.of({ name: "Pig", extensions: ["pig"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "pig.js").then(m => legacy(m.pig)) }),
  LanguageDescription.of({ name: "PowerShell", extensions: ["ps1","psd1","psm1"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "powershell.js").then(m => legacy(m.powerShell)) }),
  LanguageDescription.of({ name: "Properties files", alias: ["ini","properties"], extensions: ["properties","ini","in"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "properties.js").then(m => legacy(m.properties)) }),
  LanguageDescription.of({ name: "ProtoBuf", extensions: ["proto"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "protobuf.js").then(m => legacy(m.protobuf)) }),
  LanguageDescription.of({ name: "Pug", alias: ["jade"], extensions: ["pug","jade"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "pug.js").then(m => legacy(m.pug)) }),
  LanguageDescription.of({ name: "Puppet", extensions: ["pp"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "puppet.js").then(m => legacy(m.puppet)) }),
  LanguageDescription.of({ name: "Q", extensions: ["q"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "q.js").then(m => legacy(m.q)) }),
  LanguageDescription.of({ name: "R", alias: ["rscript"], extensions: ["r","R"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "r.js").then(m => legacy(m.r)) }),
  LanguageDescription.of({ name: "RPM Changes", load: () => import(/* @vite-ignore */ CDN_LEGACY + "rpm.js").then(m => legacy(m.rpmChanges)) }),
  LanguageDescription.of({ name: "RPM Spec", extensions: ["spec"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "rpm.js").then(m => legacy(m.rpmSpec)) }),
  LanguageDescription.of({ name: "Ruby", alias: ["jruby","macruby","rake","rb","rbx"], extensions: ["rb"], filename: /^(Gemfile|Rakefile)$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "ruby.js").then(m => legacy(m.ruby)) }),
  LanguageDescription.of({ name: "SAS", extensions: ["sas"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "sas.js").then(m => legacy(m.sas)) }),
  LanguageDescription.of({ name: "Scala", extensions: ["scala"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.scala)) }),
  LanguageDescription.of({ name: "Scheme", extensions: ["scm","ss"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "scheme.js").then(m => legacy(m.scheme)) }),
  LanguageDescription.of({ name: "Shell", alias: ["bash","sh","zsh"], extensions: ["sh","ksh","bash"], filename: /^PKGBUILD$/i, load: () => import(/* @vite-ignore */ CDN_LEGACY + "shell.js").then(m => legacy(m.shell)) }),
  LanguageDescription.of({ name: "Sieve", extensions: ["siv","sieve"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "sieve.js").then(m => legacy(m.sieve)) }),
  LanguageDescription.of({ name: "Smalltalk", extensions: ["st"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "smalltalk.js").then(m => legacy(m.smalltalk)) }),
  LanguageDescription.of({ name: "Solr", load: () => import(/* @vite-ignore */ CDN_LEGACY + "solr.js").then(m => legacy(m.solr)) }),
  LanguageDescription.of({ name: "SML", extensions: ["sml","sig","fun","smackspec"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mllike.js").then(m => legacy(m.sml)) }),
  LanguageDescription.of({ name: "SPARQL", alias: ["sparul"], extensions: ["rq","sparql"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "sparql.js").then(m => legacy(m.sparql)) }),
  LanguageDescription.of({ name: "Spreadsheet", alias: ["excel","formula"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "spreadsheet.js").then(m => legacy(m.spreadsheet)) }),
  LanguageDescription.of({ name: "Squirrel", extensions: ["nut"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "clike.js").then(m => legacy(m.squirrel)) }),
  LanguageDescription.of({ name: "Stylus", extensions: ["styl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "stylus.js").then(m => legacy(m.stylus)) }),
  LanguageDescription.of({ name: "Swift", extensions: ["swift"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "swift.js").then(m => legacy(m.swift)) }),
  LanguageDescription.of({ name: "sTeX", load: () => import(/* @vite-ignore */ CDN_LEGACY + "stex.js").then(m => legacy(m.stex)) }),
  LanguageDescription.of({ name: "LaTeX", alias: ["tex"], extensions: ["text","ltx","tex"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "stex.js").then(m => legacy(m.stex)) }),
  LanguageDescription.of({ name: "SystemVerilog", extensions: ["v","sv","svh"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "verilog.js").then(m => legacy(m.verilog)) }),
  LanguageDescription.of({ name: "Tcl", extensions: ["tcl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "tcl.js").then(m => legacy(m.tcl)) }),
  LanguageDescription.of({ name: "Textile", extensions: ["textile"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "textile.js").then(m => legacy(m.textile)) }),
  LanguageDescription.of({ name: "TiddlyWiki", load: () => import(/* @vite-ignore */ CDN_LEGACY + "tiddlywiki.js").then(m => legacy(m.tiddlyWiki)) }),
  LanguageDescription.of({ name: "Tiki wiki", load: () => import(/* @vite-ignore */ CDN_LEGACY + "tiki.js").then(m => legacy(m.tiki)) }),
  LanguageDescription.of({ name: "TOML", extensions: ["toml"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "toml.js").then(m => legacy(m.toml)) }),
  LanguageDescription.of({ name: "Troff", extensions: ["1","2","3","4","5","6","7","8","9"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "troff.js").then(m => legacy(m.troff)) }),
  LanguageDescription.of({ name: "TTCN", extensions: ["ttcn","ttcn3","ttcnpp"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "ttcn.js").then(m => legacy(m.ttcn)) }),
  LanguageDescription.of({ name: "TTCN_CFG", extensions: ["cfg"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "ttcn-cfg.js").then(m => legacy(m.ttcnCfg)) }),
  LanguageDescription.of({ name: "Turtle", extensions: ["ttl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "turtle.js").then(m => legacy(m.turtle)) }),
  LanguageDescription.of({ name: "Web IDL", extensions: ["webidl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "webidl.js").then(m => legacy(m.webIDL)) }),
  LanguageDescription.of({ name: "VB.NET", extensions: ["vb"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "vb.js").then(m => legacy(m.vb)) }),
  LanguageDescription.of({ name: "VBScript", extensions: ["vbs"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "vbscript.js").then(m => legacy(m.vbScript)) }),
  LanguageDescription.of({ name: "Velocity", extensions: ["vtl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "velocity.js").then(m => legacy(m.velocity)) }),
  LanguageDescription.of({ name: "Verilog", extensions: ["v"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "verilog.js").then(m => legacy(m.verilog)) }),
  LanguageDescription.of({ name: "VHDL", extensions: ["vhd","vhdl"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "vhdl.js").then(m => legacy(m.vhdl)) }),
  LanguageDescription.of({ name: "XQuery", extensions: ["xy","xquery","xq","xqm","xqy"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "xquery.js").then(m => legacy(m.xQuery)) }),
  LanguageDescription.of({ name: "Yacas", extensions: ["ys"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "yacas.js").then(m => legacy(m.yacas)) }),
  LanguageDescription.of({ name: "Z80", extensions: ["z80"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "z80.js").then(m => legacy(m.z80)) }),
  LanguageDescription.of({ name: "MscGen", extensions: ["mscgen","mscin","msc"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mscgen.js").then(m => legacy(m.mscgen)) }),
  LanguageDescription.of({ name: "Xù", extensions: ["xu"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mscgen.js").then(m => legacy(m.xu)) }),
  LanguageDescription.of({ name: "MsGenny", extensions: ["msgenny"], load: () => import(/* @vite-ignore */ CDN_LEGACY + "mscgen.js").then(m => legacy(m.msgenny)) }),
]

const SPECIAL_LANGUAGE_IDS = new Map<string, string>([
  ['c++', 'cpp'],
  ['c#', 'csharp'],
  ['f#', 'fsharp'],
  ['objective-c', 'objective-c'],
  ['objective-c++', 'objective-cpp'],
  ['plaintext', 'plaintext'],
])

const LANGUAGE_ALIASES = new Map<string, string>(Object.entries({
  plain: 'plaintext',
  text: 'plaintext',
  txt: 'plaintext',
  markup: 'html',
  htm: 'html',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  // jsx/tsx are distinct CodeMirror languages — do not collapse into js/ts
  ts: 'typescript',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  shell: 'shell',
  shellscript: 'shell',
  shellsession: 'shell',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  cs: 'csharp',
  csharp: 'csharp',
  cpp: 'cpp',
  'c++': 'cpp',
  md: 'markdown',
  yml: 'yaml',
  jsonc: 'json',
  // Common Shiki / Flourite IDs → CodeMirror canonical IDs
  wasm: 'webassembly',
  'objective-cpp': 'objective-cpp',
  objectivec: 'objective-c',
  objectivecpp: 'objective-cpp',
}))

export const xaiHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, class: 'cm-comment' },
  { tag: [tags.keyword, tags.modifier], class: 'cm-keyword' },
  { tag: [tags.atom, tags.bool, tags.number, tags.integer, tags.float], class: 'cm-atom' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], class: 'cm-string' },
  { tag: [tags.definition(tags.variableName), tags.function(tags.variableName), tags.function(tags.definition(tags.variableName))], class: 'cm-def' },
  { tag: [tags.variableName, tags.self], class: 'cm-variable' },
  { tag: [tags.className, tags.definition(tags.className)], class: 'cm-variable-2' },
  { tag: [tags.typeName, tags.definition(tags.typeName), tags.namespace], class: 'cm-type' },
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], class: 'cm-property' },
  { tag: [tags.standard(tags.variableName), tags.standard(tags.propertyName)], class: 'cm-builtin' },
  { tag: [tags.tagName, tags.angleBracket], class: 'cm-tag' },
  { tag: tags.attributeName, class: 'cm-attribute' },
  { tag: [tags.meta, tags.processingInstruction], class: 'cm-meta' },
  { tag: [tags.operator, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator, tags.derefOperator], class: 'cm-operator' },
  { tag: [tags.punctuation, tags.separator, tags.bracket, tags.squareBracket, tags.paren, tags.brace], class: 'cm-bracket' },
  { tag: tags.invalid, class: 'cm-error' },
])

export const xaiSyntaxHighlighting = syntaxHighlighting(xaiHighlightStyle)

const baseEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--bg)',
    color: 'var(--fg)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--editor-font-size)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: 'var(--editor-line-height)',
  },
  '.cm-content': {
    minHeight: '100%',
    padding: 'var(--editor-code-padding-y) 0',
  },
  '.cm-line': {
    padding: '0 var(--editor-code-padding-x)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--text-tertiary)',
    borderRight: 'var(--editor-gutter-border-width) solid var(--border-subtle)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--surface)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--surface)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--fg)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--focus-ring) !important',
  },
}, { dark: true })

let _languageMap: Map<string, string> | null = null
let _validLanguages: Set<string> | null = null
let _canonicalLanguageIds: string[] | null = null
/** Successfully loaded language extensions (LanguageSupport / Language / []). */
const _loadedLanguageExtensions = new Map<string, Extension>()
/** In-flight loads so concurrent setLanguage() calls share one import. */
const _loadingLanguageExtensions = new Map<string, Promise<Extension>>()

function normalizeRawLanguage(language: string | null | undefined): string {
  return String(language || 'plaintext').trim().toLowerCase()
}

function toCssLanguageId(language: string): string {
  return normalizeRawLanguage(language)
    .replace(/#/g, 'sharp')
    .replace(/\+/g, 'p')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'plaintext'
}

function descriptionId(description: LanguageDescription): string {
  const rawName = normalizeRawLanguage(description?.name)
  return SPECIAL_LANGUAGE_IDS.get(rawName) || toCssLanguageId(rawName)
}

function ensureLanguageIndex(): void {
  if (_languageMap && _validLanguages && _canonicalLanguageIds) return

  _languageMap = new Map([['plaintext', 'plaintext']])
  _validLanguages = new Set(['plaintext'])
  const canonical = new Set<string>(['plaintext'])

  for (const description of languages) {
    const id = descriptionId(description)
    // description.alias already includes the lowercased name (LanguageDescription.of)
    const names = [description.name, ...(description.alias || [])]

    canonical.add(id)
    _validLanguages.add(id)
    _languageMap.set(id, id)

    for (const name of names) {
      const raw = normalizeRawLanguage(name)
      const cssId = toCssLanguageId(raw)
      _validLanguages.add(raw)
      _validLanguages.add(cssId)
      _languageMap.set(raw, id)
      _languageMap.set(cssId, id)
    }
  }

  // Aliases only fill gaps — never overwrite a real language id (e.g. jsx, tsx)
  for (const [alias, target] of LANGUAGE_ALIASES) {
    _validLanguages.add(alias)
    if (!_languageMap.has(alias)) {
      _languageMap.set(alias, target)
    }
  }

  _canonicalLanguageIds = [...canonical].sort((a, b) => a.localeCompare(b))
}

export function normalizeLanguageId(language: string | null | undefined): string {
  ensureLanguageIndex()
  const raw = normalizeRawLanguage(language)
  let mapped = _languageMap!.get(raw) || LANGUAGE_ALIASES.get(raw) || raw
  // One extra hop for alias → alias → canonical (e.g. shellscript → shell)
  mapped = _languageMap!.get(mapped) || LANGUAGE_ALIASES.get(mapped) || mapped
  return toCssLanguageId(mapped)
}

export function languageClassName(language: string): string {
  return `language-${normalizeLanguageId(language)}`
}

export function getLanguageMap(): Record<string, string> {
  ensureLanguageIndex()
  return Object.fromEntries(_languageMap!.entries())
}

export function getValidLanguageSet(): Set<string> {
  ensureLanguageIndex()
  return new Set(_validLanguages!)
}

/** Canonical language IDs for the language picker (not every alias). */
export function getAvailableLanguageIds(): string[] {
  ensureLanguageIndex()
  return _canonicalLanguageIds!.slice()
}

export function populateLanguageDatalist(dataList: HTMLElement | null): void {
  if (!dataList) return
  dataList.innerHTML = ''

  for (const language of getAvailableLanguageIds()) {
    const option = document.createElement('option')
    option.value = language
    dataList.appendChild(option)
  }
}

export function isLanguageSupported(language: string): boolean {
  const id = normalizeLanguageId(language)
  if (id === 'plaintext') return true
  return Boolean(findLanguageDescription(id))
}

function findLanguageDescription(language: string): LanguageDescription | null {
  ensureLanguageIndex()
  const raw = normalizeRawLanguage(language)
  const normalized = normalizeLanguageId(raw)

  // Match by our canonical CSS id first (handles multi-word names like "MariaDB SQL" → mariadb-sql)
  for (const description of languages) {
    if (descriptionId(description) === normalized) return description
  }

  const searchNames = [
    raw,
    normalized,
    LANGUAGE_ALIASES.get(raw),
    LANGUAGE_ALIASES.get(normalized),
    _languageMap?.get(raw),
    _languageMap?.get(normalized),
  ].filter(Boolean) as string[]

  // Prefer exact name/alias matches before fuzzy (avoids "c" matching "Clojure", etc.)
  for (const name of searchNames) {
    const exact = LanguageDescription.matchLanguageName(languages, name, false)
    if (exact) return exact
  }

  for (const name of searchNames) {
    // Skip very short fuzzy queries — too many false positives
    if (name.length < 2) continue
    const fuzzy = LanguageDescription.matchLanguageName(languages, name, true)
    if (fuzzy) return fuzzy
  }

  return null
}

/**
 * Load (and cache) the CodeMirror language extension for a language id.
 * Returns LanguageSupport / Language / [] suitable for Compartment.reconfigure().
 */
export async function getLanguageExtension(language: string): Promise<Extension> {
  const id = normalizeLanguageId(language)
  if (id === 'plaintext') return []

  const cached = _loadedLanguageExtensions.get(id)
  if (cached !== undefined) return cached

  const inflight = _loadingLanguageExtensions.get(id)
  if (inflight) return inflight

  const loadPromise = (async (): Promise<Extension> => {
    const description = findLanguageDescription(id)
    if (!description) {
      // Do not cache misses forever — caller may use a better id later;
      // only cache successful loads and explicit plaintext.
      return []
    }

    try {
      // LanguageDescription.load() → LanguageSupport (modern) or Language (legacy StreamLanguage)
      const support = await description.load()
      // Pass the support object itself so CodeMirror flattens `.extension` correctly
      const extension: Extension = (support ?? []) as Extension
      _loadedLanguageExtensions.set(id, extension)
      return extension
    } catch (error) {
      console.warn(`Failed to load CodeMirror language "${id}"`, error)
      // Do not cache failures — allow retry on next switch
      return []
    } finally {
      _loadingLanguageExtensions.delete(id)
    }
  })()

  _loadingLanguageExtensions.set(id, loadPromise)
  return loadPromise
}

interface EditorOptions {
  language?: string
  doc?: string
  onChange?: (value: string) => void
  onSave?: () => void
}

export async function createCodeEditor(parent: HTMLElement, options: EditorOptions = {}): Promise<EditorHandle | null> {
  if (!parent) return null

  parent.innerHTML = ''

  const languageCompartment = new Compartment()
  const languageExtension = await getLanguageExtension(options.language || 'plaintext')
  const onChange = options.onChange
  const onSave = options.onSave
  /** Monotonic token so rapid language switches only apply the latest load. */
  let languageRequestId = 0

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.doc || '',
      extensions: [
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onSave?.()
              return true
            },
          },
          indentWithTab,
        ]),
        basicSetup,
        baseEditorTheme,
        xaiSyntaxHighlighting,
        EditorView.lineWrapping,
        languageCompartment.of(languageExtension),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString())
          }
        }),
      ],
    }),
  })

  return {
    view,
    getValue() {
      return view.state.doc.toString()
    },
    setValue(value: string) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    },
    focus() {
      view.focus()
    },
    setCursorToEnd() {
      const end = view.state.doc.length
      view.dispatch({ selection: { anchor: end }, scrollIntoView: true })
      view.focus()
    },
    async setLanguage(language: string) {
      const requestId = ++languageRequestId
      const extension = await getLanguageExtension(language)
      // Ignore stale results if the user switched language again while loading
      if (requestId !== languageRequestId) return
      view.dispatch({ effects: languageCompartment.reconfigure(extension) })
    },
    destroy() {
      view.destroy()
    },
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function lineStarts(source: string, lines: string[]): number[] {
  const starts: number[] = []
  let offset = 0

  for (const line of lines) {
    starts.push(offset)
    offset += line.length + 1
  }

  return starts
}

interface HighlightRange {
  from: number
  to: number
  classes: string
}

function renderHighlightedSegment(source: string, from: number, to: number, ranges: HighlightRange[]): string {
  let html = ''
  let cursor = from

  for (const range of ranges) {
    const rangeFrom = Math.max(range.from, from)
    const rangeTo = Math.min(range.to, to)

    if (rangeTo <= from || rangeFrom >= to || rangeTo <= rangeFrom) continue

    if (rangeFrom > cursor) {
      html += escapeHtml(source.slice(cursor, rangeFrom))
    }

    if (rangeTo > cursor) {
      html += `<span class="${range.classes}">${escapeHtml(source.slice(Math.max(cursor, rangeFrom), rangeTo))}</span>`
      cursor = rangeTo
    }
  }

  if (cursor < to) {
    html += escapeHtml(source.slice(cursor, to))
  }

  return html || '&#8203;'
}

export async function getHighlightedLines(content: string, language = 'plaintext'): Promise<string[]> {
  const source = String(content ?? '')
  const normalizedLanguage = normalizeLanguageId(language)
  const languageExtension = await getLanguageExtension(normalizedLanguage)
  const ranges: HighlightRange[] = []

  // Empty array means plaintext / unsupported; LanguageSupport is a non-array object
  const hasLanguage = Array.isArray(languageExtension)
    ? languageExtension.length > 0
    : languageExtension != null

  if (hasLanguage) {
    const state = EditorState.create({
      doc: source,
      extensions: [languageExtension],
    })

    highlightTree(syntaxTree(state), xaiHighlightStyle, (from, to, classes) => {
      ranges.push({ from, to, classes })
    })
  }

  ranges.sort((a, b) => a.from - b.from || b.to - a.to)

  const lines = source.split('\n')
  const starts = lineStarts(source, lines)

  return lines.map((line, index) => {
    const from = starts[index]
    const to = from + line.length
    return renderHighlightedSegment(source, from, to, ranges)
  })
}

interface RenderOptions {
  lineNumbers?: boolean
  className?: string
}

export async function renderStaticHighlightedCode(container: HTMLElement, content: string, language = 'plaintext', options: RenderOptions = {}): Promise<void> {
  if (!container) return

  const source = String(content ?? '')
  const normalizedLanguage = normalizeLanguageId(language)
  const highlightedLines = await getHighlightedLines(source, normalizedLanguage)
  const lineNumbers = options.lineNumbers !== false

  container.innerHTML = ''
  container.className = [
    'cm-static',
    lineNumbers ? 'cm-static-line-numbers' : '',
    languageClassName(normalizedLanguage),
    options.className || '',
  ].filter(Boolean).join(' ')
  container.dataset.language = normalizedLanguage
  ;(container as HTMLElement & { __rawCode: string }).__rawCode = source

  highlightedLines.forEach((lineHtml, index) => {
    const row = document.createElement('div')
    row.className = 'cm-static-line'

    if (lineNumbers) {
      const gutter = document.createElement('span')
      gutter.className = 'cm-static-line-number'
      gutter.textContent = String(index + 1)
      row.appendChild(gutter)
    }

    const code = document.createElement('code')
    code.className = 'cm-static-code'
    code.innerHTML = lineHtml
    row.appendChild(code)
    container.appendChild(row)
  })
}
