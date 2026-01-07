import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false, // Required for most cloud providers
    },
});

export const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        code VARCHAR(10) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'waiting',
        players JSONB NOT NULL DEFAULT '[]',
        game_state JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Database initialized: "rooms" table ready.');
    } finally {
        client.release();
    }
};

export interface Room {
    code: string;
    status: 'waiting' | 'playing' | 'finished';
    players: any[];
    game_state: any;
    created_at: Date;
}

// Helpers
export const createRoom = async (code: string, hostPlayer: any): Promise<Room> => {
    const query = `
    INSERT INTO rooms (code, players)
    VALUES ($1, $2)
    RETURNING *;
  `;
    const values = [code, JSON.stringify([hostPlayer])];
    const res = await pool.query(query, values);
    return res.rows[0];
};

export const getRoom = async (code: string): Promise<Room | null> => {
    const res = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
    return res.rows[0] || null;
};

export const addPlayerToRoom = async (code: string, player: any): Promise<Room | null> => {
    // We need to append to the players array.
    // Using PG's jsonb_set or || operator (concatenation)
    const query = `
    UPDATE rooms
    SET players = players || $2::jsonb
    WHERE code = $1
    RETURNING *;
  `;
    const values = [code, JSON.stringify([player])];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
};

export const updateGameState = async (code: string, gameState: any): Promise<Room | null> => {
    const query = `
    UPDATE rooms
    SET game_state = $2, status = 'playing'
    WHERE code = $1
    RETURNING *;
  `;
    const values = [code, JSON.stringify(gameState)];
    const res = await pool.query(query, values);
    return res.rows[0] || null;
};

export const updateRoomStatus = async (code: string, status: string): Promise<Room | null> => {
    const query = `
      UPDATE rooms
      SET status = $2
      WHERE code = $1
      RETURNING *;
    `;
    const res = await pool.query(query, [code, status]);
    return res.rows[0] || null;
}

export const removePlayerFromRoom = async (code: string, playerId: string): Promise<Room | null> => {
    // Read, Filter, Write approach might be safer for complex logic, but SQL approach is faster.
    // However, removing from a JSON array by ID is tricky in SQL without a known index.
    // Let's do Read-Modify-Write transaction for safety or a smart SQL query.
    // For simplicity:
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roomRes = await client.query('SELECT * FROM rooms WHERE code = $1', [code]);
        if (roomRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }
        let room = roomRes.rows[0];
        const newPlayers = room.players.filter((p: any) => p.id !== playerId);

        if (newPlayers.length === 0) {
            await client.query('DELETE FROM rooms WHERE code = $1', [code]);
            await client.query('COMMIT');
            return null; // Room deleted
        } else {
            const updateRes = await client.query('UPDATE rooms SET players = $2 WHERE code = $1 RETURNING *', [code, JSON.stringify(newPlayers)]);
            await client.query('COMMIT');
            return updateRes.rows[0];
        }
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

export const deleteRoom = async (code: string) => {
    await pool.query('DELETE FROM rooms WHERE code = $1', [code]);
}
