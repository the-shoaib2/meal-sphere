#!/usr/bin/env tsx

// npx tsx scripts/debug-oauth.ts

import { authOptions } from '../lib/auth/auth'

async function debugOAuthConfig() {
  console.log('🔍 Google OAuth Configuration Debug')
  console.log('=====================================')
  
  // Check environment variables
  console.log('\n📋 Environment Variables:')
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET')
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ NOT SET')
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ NOT SET')
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ SET' : '❌ NOT SET')
  
  // Check Google provider configuration
  const googleProvider = authOptions.providers.find(p => p.id === 'google')
  
  if (googleProvider) {
    console.log('\n🔧 Google Provider Configuration:')
    console.log('Provider ID:', googleProvider.id)
    
    // Access the provider configuration more directly
    const providerConfig = googleProvider as any
    console.log('Client ID:', providerConfig.clientId ? '✅ SET' : '❌ NOT SET')
    console.log('Client Secret:', providerConfig.clientSecret ? '✅ SET' : '❌ NOT SET')
    
    if (providerConfig.clientId) {
      console.log('Client ID (first 10 chars):', providerConfig.clientId.substring(0, 10) + '...')
    }
    
    const authConfig = providerConfig.authorization
    if (authConfig) {
      console.log('Authorization Params:', authConfig.params)
    }
    
    // Check if the provider is properly configured
    if (!providerConfig.clientId || !providerConfig.clientSecret) {
      console.log('\n❌ ISSUE DETECTED: Google provider is missing client credentials!')
      console.log('This is likely why you\'re getting "Access Denied" errors.')
    } else {
      console.log('\n✅ Google provider appears to be properly configured')
    }
  } else {
    console.log('\n❌ Google provider not found in configuration')
  }
  
  // Check callback URLs
  console.log('\n🌐 Callback URLs:')
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  console.log('Base URL:', baseUrl)
  console.log('Callback URL:', `${baseUrl}/api/auth/callback/google`)
  
  // Check pages configuration
  console.log('\n📄 Pages Configuration:')
  console.log('Sign In Page:', authOptions.pages?.signIn || '/api/auth/signin')
  console.log('Error Page:', authOptions.pages?.error || '/api/auth/error')
  
  // Recommendations
  console.log('\n💡 Recommendations:')
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local file')
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    console.log('❌ Set NEXTAUTH_SECRET in your .env.local file')
  }
  
  if (!process.env.NEXTAUTH_URL) {
    console.log('⚠️  NEXTAUTH_URL is not set. This may cause issues in production.')
  }
  
  // Check if the issue is with environment variable loading
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const googleProvider = authOptions.providers.find(p => p.id === 'google') as any
    if (!googleProvider?.clientId || !googleProvider?.clientSecret) {
      console.log('\n🚨 CRITICAL ISSUE: Environment variables are set but not loaded into the provider!')
      console.log('This suggests a timing issue with environment variable loading.')
      console.log('Try restarting your development server.')
    }
  }
  
  console.log('\n🔗 Google Cloud Console Setup:')
  console.log('1. Go to https://console.cloud.google.com/')
  console.log('2. Select your project')
  console.log('3. Go to APIs & Services > Credentials')
  console.log('4. Edit your OAuth 2.0 Client ID')
  console.log('5. Add these Authorized redirect URIs:')
  console.log(`   - ${baseUrl}/api/auth/callback/google`)
  console.log('6. Add these Authorized JavaScript origins:')
  console.log(`   - ${baseUrl}`)
  
  console.log('\n✅ Debug complete!')
}

debugOAuthConfig().catch(console.error) 