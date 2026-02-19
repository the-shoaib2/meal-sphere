import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import prisma from "@/lib/services/prisma"
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns'


// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic';

// GET is disabled. Use direct SSR fetching via prisma in the page component. 
