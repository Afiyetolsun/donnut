import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Test the connection
    const client = await pool.connect();
    const result: any = {
      status: 'success',
      message: 'Successfully connected to the database!',
      tables: []
    };

    // List all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    // Get table schemas
    for (const row of tablesResult.rows) {
      const schemaResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);

      result.tables.push({
        name: row.table_name,
        columns: schemaResult.rows.map(column => ({
          name: column.column_name,
          type: column.data_type,
          nullable: column.is_nullable === 'YES'
        }))
      });
    }

    client.release();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
} 