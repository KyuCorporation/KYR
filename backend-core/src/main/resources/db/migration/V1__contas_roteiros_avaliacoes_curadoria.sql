-- Primeira migration do KYR: contas, sessões, roteiros salvos, avaliações de destinos e cache de curadoria.
--
-- Sobre dados do Google Maps (termos da Places API): só podem ser guardados o ID do lugar (sem prazo) e
-- latitude/longitude (por até 30 dias). Nome, endereço, nota e avaliações de lugares do Google NÃO são gravados.

create table usuario (
    id          bigserial primary key,
    nome        varchar(120) not null,
    email       varchar(254) not null unique,
    senha_hash  varchar(100) not null,
    criado_em   timestamptz  not null default now()
);

-- O token da sessão nunca é gravado: só o SHA-256 dele.
create table sessao (
    token_hash  char(64) primary key,
    usuario_id  bigint      not null references usuario (id) on delete cascade,
    expira_em   timestamptz not null
);

create index sessao_expira_em_idx on sessao (expira_em);

-- Origem e destino são o texto que a pessoa escolheu no formulário. As coordenadas podem ter vindo do
-- Google, então são apagadas depois de 30 dias (ver LimpezaDeCoordenadas). place_ids guarda os IDs dos
-- lugares sugeridos, separados por vírgula.
create table roteiro_salvo (
    id                 bigserial primary key,
    usuario_id         bigint        not null references usuario (id) on delete cascade,
    origem_nome        varchar(300)  not null,
    origem_latitude    double precision,
    origem_longitude   double precision,
    destino_nome       varchar(300)  not null,
    destino_latitude   double precision,
    destino_longitude  double precision,
    total_pontos       integer       not null default 0,
    place_ids          text          not null default '',
    criado_em          timestamptz   not null default now()
);

create index roteiro_salvo_usuario_idx on roteiro_salvo (usuario_id, criado_em desc);

-- Avaliações escritas por usuários do KYR sobre os destinos do catálogo do próprio app (não são do Google).
create table avaliacao_destino (
    id            bigserial primary key,
    usuario_id    bigint       not null references usuario (id) on delete cascade,
    destino_slug  varchar(120) not null,
    nota          smallint     not null check (nota between 1 and 5),
    comentario    varchar(600) not null default '',
    criado_em     timestamptz  not null default now(),
    unique (usuario_id, destino_slug)
);

create index avaliacao_destino_slug_idx on avaliacao_destino (destino_slug, criado_em desc);

-- Curadoria feita pela IA (trilha, tipo e descrição são conteúdo do KYR), indexada pelo ID do lugar.
create table curadoria_poi (
    place_id   varchar(300) primary key,
    trilha     varchar(30)  not null,
    tipo       varchar(30)  not null,
    descricao  text         not null,
    modelo     varchar(100) not null,
    curado_em  timestamptz  not null default now()
);
