import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "players" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(100) NOT NULL,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_players" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "leagues" (
        "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"         VARCHAR(200) NOT NULL,
        "umaSmall"     INT NOT NULL DEFAULT 10,
        "umaBig"       INT NOT NULL DEFAULT 30,
        "oka"          INT NOT NULL DEFAULT 20,
        "startPoint"   INT NOT NULL DEFAULT 25000,
        "returnPoint"  INT NOT NULL DEFAULT 30000,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leagues" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "league_players" (
        "leagueId"   UUID NOT NULL,
        "playerId"   UUID NOT NULL,
        "joinedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_league_players" PRIMARY KEY ("leagueId", "playerId"),
        CONSTRAINT "FK_league_players_league"
          FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_league_players_player"
          FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "games" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "leagueId"  UUID NOT NULL,
        "playedAt"  TIMESTAMPTZ NOT NULL,
        "tableNo"   INT NOT NULL,
        CONSTRAINT "PK_games" PRIMARY KEY ("id"),
        CONSTRAINT "FK_games_league"
          FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_games_leagueId_playedAt"
        ON "games" ("leagueId", "playedAt" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "game_results" (
        "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
        "gameId"    UUID NOT NULL,
        "playerId"  UUID NOT NULL,
        "rank"      SMALLINT NOT NULL,
        "rawScore"  INT NOT NULL,
        "point"     DECIMAL(7,1) NOT NULL,
        CONSTRAINT "PK_game_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_game_results_game"
          FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_game_results_player"
          FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_gameId"
        ON "game_results" ("gameId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_game_results_playerId"
        ON "game_results" ("playerId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "game_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "games"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "league_players"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leagues"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players"`);
  }
}
