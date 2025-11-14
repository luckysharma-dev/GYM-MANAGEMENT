import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { LogOut, Calendar, CreditCard, User, Mail, Phone, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import logo from 'figma:asset/2e5ce00f22da18ed5eccfe108d2ac7068cbf734b.png';

interface MemberDashboardProps {
  accessToken: string;
  onSignOut: () => void;
  userName?: string;
  userEmail?: string;
}

export default function MemberDashboard({ accessToken, onSignOut, userName, userEmail }: MemberDashboardProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ef427903/my-subscription`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSubscription(data.member);
      } else {
        setError(data.error || 'Failed to load subscription');
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      case 'pending':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDaysRemaining = () => {
    if (!subscription?.subscriptionEnd) return null;
    const endDate = new Date(subscription.subscriptionEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Vyayamshala" className="h-20 w-auto" />
          </div>
          <Button onClick={onSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Welcome Section */}
        <Card className="mb-6 bg-gradient-to-r from-orange-600 to-orange-700 border-0">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Welcome back, {userName || 'Member'}!</CardTitle>
            <CardDescription className="text-orange-100">
              Here's your membership overview
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="text-white text-center py-12">Loading your subscription details...</div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !subscription ? (
          <Card>
            <CardHeader>
              <CardTitle>No Active Subscription</CardTitle>
              <CardDescription>
                You don't have an active gym membership yet. Please contact the gym administrator to set up your subscription.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Status</span>
                  <Badge className={getStatusColor(subscription.status)}>
                    {subscription.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Membership Type</span>
                  <span className="capitalize">{subscription.membershipType || 'Basic'}</span>
                </div>
                {daysRemaining !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Days Remaining</span>
                    <span className={daysRemaining > 7 ? 'text-green-600' : 'text-red-600'}>
                      {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Subscription Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Start Date</span>
                  <span>{subscription.subscriptionStart ? new Date(subscription.subscriptionStart).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">End Date</span>
                  <span>{subscription.subscriptionEnd ? new Date(subscription.subscriptionEnd).toLocaleDateString() : 'N/A'}</span>
                </div>
                {subscription.subscriptionStart && subscription.subscriptionEnd && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        Duration: {Math.ceil((new Date(subscription.subscriptionEnd).getTime() - new Date(subscription.subscriptionStart).getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Full Name</p>
                      <p>{subscription.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded">
                      <Mail className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Email</p>
                      <p>{subscription.email}</p>
                    </div>
                  </div>
                  {subscription.phoneNumber && (
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded">
                        <Phone className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Phone</p>
                        <p>{subscription.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Renewal Alert */}
            {daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
              <Card className="md:col-span-2 border-yellow-500 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-500 p-2 rounded">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-900 mb-1">Subscription Expiring Soon</h3>
                      <p className="text-sm text-yellow-700">
                        Your membership will expire in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
                        Please contact the gym to renew your subscription.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}