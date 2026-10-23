// src/pages/dashboard/LockersPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { lockersAPI, matchesAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import {
  Lock, Unlock, Copy, CheckCircle2, MapPin,
  Clock, Cpu, KeyRound, Package, PackagePlus, X, RefreshCw,
} from 'lucide-react';
import { formatRelativeTime, getLockerStateColor } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function LockersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [lockers, setLockers] = useState([]);

  // generatedOtps[lockerId] = '123456'  — stored directly from API response
  const [generatedOtps, setGeneratedOtps] = useState({});
  const [generatingOtp, setGeneratingOtp] = useState({});
  const [resetting, setResetting] = useState(false);

  // Deposit modal state
  const [depositModal, setDepositModal] = useState({ open: false, locker: null });
  const [eligibleMatches, setEligibleMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ── Data fetching ──────────────────────────────────────────
  const fetchLockers = useCallback(async () => {
    try {
      const { data } = await lockersAPI.getAll();
      setLockers(data.lockers || []);
    } catch {
      // suppress polling noise
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLockers();
    const interval = setInterval(fetchLockers, 4000);
    return () => clearInterval(interval);
  }, [fetchLockers]);

  // ── Generate OTP ───────────────────────────────────────────
  const handleGenerateOtp = async (locker) => {
    if (!locker.sessionId) return;
    setGeneratingOtp((prev) => ({ ...prev, [locker.id]: true }));
    try {
      const { data } = await lockersAPI.resendOTP(locker.sessionId);
      // Store the OTP directly — don't rely on re-fetch timing
      setGeneratedOtps((prev) => ({ ...prev, [locker.id]: data.otp }));
      toast.success(`OTP generated for ${locker.name}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate OTP');
    } finally {
      setGeneratingOtp((prev) => ({ ...prev, [locker.id]: false }));
    }
  };

  const handleCopyOtp = (otp, lockerName) => {
    navigator.clipboard.writeText(otp);
    toast.success(`OTP copied for ${lockerName}!`);
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await lockersAPI.resetDemo();
      setGeneratedOtps({});
      await fetchLockers();
      toast.success('Demo reset — all lockers available again!');
    } catch {
      toast.error('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  // ── Deposit modal ──────────────────────────────────────────
  const openDepositModal = async (locker) => {
    setDepositModal({ open: true, locker });
    setLoadingMatches(true);
    try {
      // Fetch ALL matches and fresh locker list in parallel
      const [matchRes, lockerRes] = await Promise.all([
        matchesAPI.getAll(),
        lockersAPI.getAll(),
      ]);
      const allMatches = matchRes.data.matches || [];
      const freshLockers = lockerRes.data.lockers || [];

      // Match IDs already assigned to an active locker session
      const assignedMatchIds = new Set(
        freshLockers
          .filter(l => l.session?.matchId && l.state !== 'AVAILABLE')
          .map(l => l.session.matchId)
      );

      const CLOSED = new Set(['rejected', 'cancelled']);
      const eligible = allMatches.filter(m =>
        (m.lostUserId === user?.uid || m.foundUserId === user?.uid) &&
        !CLOSED.has(m.status) &&
        !assignedMatchIds.has(m.id)
      );
      setEligibleMatches(eligible);
    } catch {
      toast.error('Could not load matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAssignLocker = async (matchId) => {
    setAssigning(true);
    const locker = depositModal.locker;
    try {
      await lockersAPI.assign(matchId);
      toast.success(`Locker ${locker.name} assigned! Item can now be deposited.`);
      setDepositModal({ open: false, locker: null });
      await fetchLockers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign locker');
    } finally {
      setAssigning(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────
  if (loading && lockers.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const myLockers = lockers.filter(
    (l) => l.session &&
      (l.session.claimedBy === user?.uid || l.session.depositedBy === user?.uid)
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Lockers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Secure contactless item exchange — OTPs are private and only shown to the rightful owner.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1.5"
          loading={resetting}
          onClick={handleResetDemo}
          title="Clear all sessions and reset lockers to AVAILABLE"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          Reset Demo
        </Button>
      </div>

      {/* ── Your Active Sessions ──────────────────────────── */}
      {myLockers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">
            Your Active Sessions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myLockers.map((locker) => {
              const session = locker.session;
              const isClaimer  = session?.claimedBy   === user?.uid;
              const isDepositor = session?.depositedBy === user?.uid;
              const isItemDeposited = ['ITEM_DEPOSITED', 'READY_FOR_COLLECTION'].includes(locker.state);
              const isOpen      = locker.state === 'OPEN';
              const isCollected = locker.state === 'COLLECTED';
              const isReserved  = locker.state === 'RESERVED';

              // Use the OTP we got back directly from the API, falling back to the
              // server-returned value (already masked for non-claimers by the backend)
              const displayOtp = generatedOtps[locker.id] || (session?.otp !== '******' ? session?.otp : null);

              return (
                <Card
                  key={locker.id}
                  className={`border-2 transition-all ${
                    isOpen
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : isClaimer && isItemDeposited
                      ? 'border-indigo-400 ring-2 ring-indigo-100'
                      : 'border-gray-200'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOpen
                          ? <Unlock className="w-5 h-5 text-emerald-600 animate-bounce" />
                          : <Lock className="w-5 h-5 text-indigo-600" />
                        }
                        <CardTitle className="text-base">{locker.name}</CardTitle>
                      </div>
                      <Badge className={getLockerStateColor(locker.state)}>
                        {locker.state.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{locker.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Last heartbeat: {formatRelativeTime(locker.lastHeartbeat)}</span>
                    </div>

                    {/* Role pill */}
                    <div className="flex gap-2 flex-wrap text-xs">
                      {isClaimer  && <span className="bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">You are collecting</span>}
                      {isDepositor && <span className="bg-amber-100  text-amber-700  font-semibold px-2 py-0.5 rounded-full">You are depositing</span>}
                    </div>

                    {/* DEPOSITOR — waiting to deposit */}
                    {isDepositor && isReserved && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        <Package className="w-4 h-4 inline mr-1.5" />
                        Please place the item in this locker then confirm on the session page.
                      </div>
                    )}

                    {/* DEPOSITOR — already deposited */}
                    {isDepositor && isItemDeposited && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                        <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                        Item deposited. The owner has been notified and will collect it.
                      </div>
                    )}

                    {/* CLAIMER — item ready, show Generate OTP */}
                    {isClaimer && isItemDeposited && (
                      <div className="space-y-3">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                          <KeyRound className="w-4 h-4 inline mr-1.5" />
                          Your item is ready to collect. Generate an OTP to unlock this locker.
                        </div>

                        {/* OTP display — only after Generate is clicked */}
                        {displayOtp && (
                          <div className="bg-white border border-indigo-300 rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                                Your OTP — keep it private
                              </p>
                              <p className="text-3xl font-mono font-bold text-indigo-700 tracking-[0.3em]">
                                {displayOtp}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopyOtp(displayOtp, locker.name)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Copy OTP"
                            >
                              <Copy className="w-5 h-5" />
                            </button>
                          </div>
                        )}

                        <Button
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
                          loading={generatingOtp[locker.id]}
                          onClick={() => handleGenerateOtp(locker)}
                        >
                          {generatingOtp[locker.id]
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <KeyRound className="w-4 h-4" />
                          }
                          {displayOtp ? 'Refresh OTP' : 'Generate OTP'}
                        </Button>
                      </div>
                    )}

                    {/* Locker open */}
                    {isOpen && (
                      <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-3 text-sm text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span><strong>Locker is open!</strong> Collect your item now.</span>
                      </div>
                    )}

                    {/* Collected */}
                    {isCollected && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-gray-400 shrink-0" />
                        Item collected. Case closed.
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => navigate(`/lockers/session/${locker.sessionId}`)}
                      >
                        View Full Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── All Lockers ───────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
          All Lockers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lockers.map((locker) => {
            const isAvailable = locker.state === 'AVAILABLE';
            const isOpen      = locker.state === 'OPEN';
            const isOffline   = locker.state === 'OFFLINE';
            const isMySession = locker.session &&
              (locker.session.claimedBy === user?.uid || locker.session.depositedBy === user?.uid);

            return (
              <Card
                key={locker.id}
                className={`transition-all hover:shadow-md ${
                  isAvailable ? 'border-green-200 hover:border-green-400' :
                  isOpen      ? 'border-emerald-300 bg-emerald-50/30' :
                  isOffline   ? 'opacity-60' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isOpen
                        ? <Unlock className="w-5 h-5 text-emerald-500 animate-bounce" />
                        : isOffline
                        ? <Cpu className="w-5 h-5 text-gray-400" />
                        : <Lock className={`w-5 h-5 ${isAvailable ? 'text-green-600' : 'text-gray-500'}`} />
                      }
                      <CardTitle className="text-sm">{locker.name}</CardTitle>
                    </div>
                    <Badge className={getLockerStateColor(locker.state)}>
                      {locker.state.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{locker.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatRelativeTime(locker.lastHeartbeat)}</span>
                  </div>
                  {locker.firmwareVersion && (
                    <p className="text-xs text-gray-400">Firmware v{locker.firmwareVersion}</p>
                  )}

                  {/* ── AVAILABLE → Insert Item button ── */}
                  {isAvailable && (
                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        className="w-full text-xs bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1.5"
                        onClick={() => openDepositModal(locker)}
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        Insert Item
                      </Button>
                    </div>
                  )}

                  {/* View Session — only for participants */}
                  {locker.sessionId && isMySession && (
                    <div className="pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => navigate(`/lockers/session/${locker.sessionId}`)}
                      >
                        View Session
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Empty state */}
      {!loading && lockers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No lockers found</p>
          <p className="text-sm">Lockers will appear here once they are registered.</p>
        </div>
      )}

      {/* ── Deposit Modal ─────────────────────────────────── */}
      <Modal
        isOpen={depositModal.open}
        onClose={() => setDepositModal({ open: false, locker: null })}
        title={`Insert Item — ${depositModal.locker?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a match to assign to this locker. The finder will deposit the item and the owner will receive an OTP to collect it.
          </p>

          {/* Locker info */}
          {depositModal.locker && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <MapPin className="w-4 h-4 text-green-600 shrink-0" />
              <span className="text-green-800 font-medium">{depositModal.locker.location}</span>
            </div>
          )}

          {loadingMatches ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : eligibleMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-sm">No eligible matches found</p>
              <p className="text-xs mt-1">
                You need a match (pending or accepted) where you are a participant
                and no locker has been assigned yet. Go to <strong>Matches</strong> to view your matches.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {eligibleMatches.map((match) => (
                <button
                  key={match.id}
                  disabled={assigning}
                  onClick={() => handleAssignLocker(match.id)}
                  className="w-full text-left border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg p-3 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 truncate">
                        {match.lostReport?.title || match.foundReport?.title || `Match #${match.id.slice(-6).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {match.lostReport?.category || match.foundReport?.category || 'Item'} &bull; {match.confidence}% match
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          match.status === 'accepted'  ? 'bg-green-100 text-green-700' :
                          match.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                          match.status === 'verified'  ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {match.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {match.lostUserId === user?.uid ? 'You lost this item' : 'You found this item'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 shrink-0 group-hover:underline">
                      {assigning ? 'Assigning…' : 'Use →'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepositModal({ open: false, locker: null })}
            >
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
