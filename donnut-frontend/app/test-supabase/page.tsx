'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('Checking database tables...')

  useEffect(() => {
    async function checkTables() {
      try {
        // Get users_wallets count
        const { count: walletsCount, error: walletsError } = await supabase
          .from('users_wallets')
          .select('*', { count: 'exact', head: true })
        
        if (walletsError) {
          console.error('Error fetching wallets count:', walletsError)
          throw new Error(`Failed to fetch wallets count: ${walletsError.message}`)
        }
        console.log('users_wallets table count:', walletsCount)

        // Get payment_links count
        const { count: linksCount, error: linksError } = await supabase
          .from('payment_links')
          .select('*', { count: 'exact', head: true })
        
        if (linksError) {
          console.error('Error fetching links count:', linksError)
          throw new Error(`Failed to fetch links count: ${linksError.message}`)
        }
        console.log('payment_links table count:', linksCount)

        // Get a sample of entries from each table
        const { data: walletSamples, error: walletSamplesError } = await supabase
          .from('users_wallets')
          .select('*')
          .limit(5)
        
        if (walletSamplesError) {
          console.error('Error fetching wallet samples:', walletSamplesError)
          throw new Error(`Failed to fetch wallet samples: ${walletSamplesError.message}`)
        }
        console.log('Sample wallet entries:', walletSamples)

        const { data: linkSamples, error: linkSamplesError } = await supabase
          .from('payment_links')
          .select('*')
          .limit(5)
        
        if (linkSamplesError) {
          console.error('Error fetching link samples:', linkSamplesError)
          throw new Error(`Failed to fetch link samples: ${linkSamplesError.message}`)
        }
        console.log('Sample payment link entries:', linkSamples)

        setStatus(`Database check complete! Found ${walletsCount} wallets and ${linksCount} payment links. Check console for details.`)
      } catch (error) {
        console.error('Database check failed:', error)
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          })
          setStatus(`Database check failed: ${error.message}`)
        } else {
          console.error('Unknown error type:', error)
          setStatus('Database check failed: Unknown error occurred')
        }
      }
    }

    checkTables()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Supabase Database Check</h1>
        <div className="p-4 bg-gray-50 rounded">
          <p className="text-gray-700">{status}</p>
        </div>
      </div>
    </div>
  )
} 