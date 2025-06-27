#!/usr/bin/env tsx

// Simple test to verify Google OAuth configuration
console.log('🧪 Testing Google OAuth Configuration...')

// Test environment variables
const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'NEXTAUTH_SECRET'
]

let allVarsSet = true
console.log('\n📋 Environment Variables Check:')
for (const varName of requiredVars) {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: SET`)
  } else {
    console.log(`❌ ${varName}: NOT SET`)
    allVarsSet = false
  }
}

if (!allVarsSet) {
  console.log('\n❌ Missing required environment variables!')
  console.log('Please check your .env.local file.')
  process.exit(1)
}

// Test auth configuration loading
try {
  console.log('\n🔧 Testing Auth Configuration...')
  const { authOptions } = await import('../lib/auth/auth')
  
  const googleProvider = authOptions.providers.find(p => p.id === 'google')
  if (googleProvider) {
    const config = googleProvider as any
    if (config.clientId && config.clientSecret) {
      console.log('✅ Google provider configured successfully')
      console.log('✅ Client ID and Secret are loaded')
    } else {
      console.log('❌ Google provider missing credentials')
      console.log('This indicates an environment variable loading issue')
    }
  } else {
    console.log('❌ Google provider not found')
  }
  
  console.log('\n✅ OAuth configuration test completed!')
  console.log('If all checks passed, try the Google sign-in again.')
  
} catch (error) {
  console.error('❌ Error testing auth configuration:', error)
  process.exit(1)
} 