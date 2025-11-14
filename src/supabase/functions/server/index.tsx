import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { logger } from 'npm:hono/logger'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as kv from './kv_store.tsx'

const app = new Hono()

app.use('*', cors())
app.use('*', logger(console.log))

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Sign up new user (member or admin)
app.post('/make-server-ef427903/signup', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name, role = 'member' } = body

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400)
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    })

    if (authError) {
      console.log(`Error creating user during signup: ${authError.message}`)
      return c.json({ error: authError.message }, 400)
    }

    // Store user profile in KV store
    const userProfile = {
      id: authData.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString()
    }

    await kv.set(`user:${authData.user.id}`, userProfile)

    return c.json({ success: true, user: userProfile })
  } catch (error) {
    console.log(`Error in signup route: ${error}`)
    return c.json({ error: 'Failed to sign up user' }, 500)
  }
})

// Get current user profile
app.get('/make-server-ef427903/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401)
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user) {
      console.log(`Error getting user in profile route: ${error?.message}`)
      return c.json({ error: 'Unauthorized - invalid token' }, 401)
    }

    const profile = await kv.get(`user:${user.id}`)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    return c.json({ profile })
  } catch (error) {
    console.log(`Error in profile route: ${error}`)
    return c.json({ error: 'Failed to get profile' }, 500)
  }
})

// Add or update member (admin only)
app.post('/make-server-ef427903/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      console.log(`Error getting user in add member route: ${authError?.message}`)
      return c.json({ error: 'Unauthorized - invalid token' }, 401)
    }

    // Check if user is admin
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile || adminProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - admin access required' }, 403)
    }

    const body = await c.req.json()
    const { id, name, email, phoneNumber, subscriptionStart, subscriptionEnd, status, membershipType } = body

    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }

    const memberId = id || crypto.randomUUID()
    const member = {
      id: memberId,
      name,
      email,
      phoneNumber: phoneNumber || '',
      subscriptionStart,
      subscriptionEnd,
      status: status || 'active',
      membershipType: membershipType || 'basic',
      createdAt: id ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await kv.set(`member:${memberId}`, member)

    return c.json({ success: true, member })
  } catch (error) {
    console.log(`Error in add/update member route: ${error}`)
    return c.json({ error: 'Failed to save member' }, 500)
  }
})

// Get all members (admin only)
app.get('/make-server-ef427903/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      console.log(`Error getting user in get members route: ${authError?.message}`)
      return c.json({ error: 'Unauthorized - invalid token' }, 401)
    }

    // Check if user is admin
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile || adminProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - admin access required' }, 403)
    }

    const members = await kv.getByPrefix('member:')
    return c.json({ members })
  } catch (error) {
    console.log(`Error in get members route: ${error}`)
    return c.json({ error: 'Failed to get members' }, 500)
  }
})

// Get member by email (for member portal)
app.get('/make-server-ef427903/my-subscription', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      console.log(`Error getting user in subscription route: ${authError?.message}`)
      return c.json({ error: 'Unauthorized - invalid token' }, 401)
    }

    // Get all members and find by email
    const allMembers = await kv.getByPrefix('member:')
    const member = allMembers.find((m: any) => m.email === user.email)

    if (!member) {
      return c.json({ error: 'No subscription found for this account' }, 404)
    }

    return c.json({ member })
  } catch (error) {
    console.log(`Error in my-subscription route: ${error}`)
    return c.json({ error: 'Failed to get subscription' }, 500)
  }
})

// Delete member (admin only)
app.delete('/make-server-ef427903/members/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1]
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401)
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      console.log(`Error getting user in delete member route: ${authError?.message}`)
      return c.json({ error: 'Unauthorized - invalid token' }, 401)
    }

    // Check if user is admin
    const adminProfile = await kv.get(`user:${user.id}`)
    if (!adminProfile || adminProfile.role !== 'admin') {
      return c.json({ error: 'Forbidden - admin access required' }, 403)
    }

    const memberId = c.req.param('id')
    await kv.del(`member:${memberId}`)

    return c.json({ success: true })
  } catch (error) {
    console.log(`Error in delete member route: ${error}`)
    return c.json({ error: 'Failed to delete member' }, 500)
  }
})

Deno.serve(app.fetch)
