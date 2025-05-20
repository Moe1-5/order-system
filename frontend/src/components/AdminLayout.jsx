// frontend/src/components/AdminLayout.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import axiosInstance from '../api/axiosInstance';
import LoadingSpinner from './LoadingSpinner';
import NotificationAlert from './NotificationAlert';
// import AdminHeader from './AdminHeader';
// import AdminSidebar from './AdminSidebar';

let socket = null;

const AdminLayout = () => {
    // --- Core State ---
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const audioRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // --- State for Notification Queue ---
    const [notificationQueue, setNotificationQueue] = useState([]); // Array of order data objects
    const [currentNotification, setCurrentNotification] = useState(null); // The order currently being shown
    const [isShowingNotification, setIsShowingNotification] = useState(false); // Controls visibility

    // Timer ref for potential future auto-dismissal or sequencing logic
    const notificationTimerRef = useRef(null);

    // --- Effect for fetching user profile ---
    useEffect(() => {
        let isMounted = true;
        const fetchUserProfile = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log("AdminLayout: No token, redirecting to login.");
                if (isMounted) setIsAuthLoading(false);
                if (location.pathname !== '/login') {
                    navigate('/login', { replace: true });
                }
                return;
            }

            if (isMounted) setIsAuthLoading(true);
            if (isMounted) setAuthError(null);
            console.log("AdminLayout: Found token, fetching user profile...");

            try {
                const response = await axiosInstance.get('/auth/me');
                if (isMounted) {
                    setCurrentUser(response.data);
                    console.log("AdminLayout: User profile loaded:", response.data);
                }
            } catch (err) {
                if (isMounted) {
                    console.error("AdminLayout: Error fetching user profile:", err.response?.data || err.message);
                    setAuthError("Your session may be invalid or expired.");
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    setCurrentUser(null);
                    if (location.pathname !== '/login') {
                        navigate('/login', { replace: true });
                    }
                }
            } finally {
                if (isMounted) {
                    setIsAuthLoading(false);
                }
            }
        };
        fetchUserProfile();
        return () => { isMounted = false; }
    }, [navigate, location.pathname]);



    useEffect(() => {
        const audioElement = audioRef.current;
        if (!audioElement) return; // Guard clause if ref not attached yet

        if (isShowingNotification) {
            // Set loop explicitly (although the attribute works too, this is belt-and-suspenders)
            audioElement.loop = true;
            // Attempt to play
            const playPromise = audioElement.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Autoplay was prevented. This often happens if the user
                    // hasn't interacted with the page yet.
                    console.error("Audio play failed:", error);
                    // You might want to show a "Click to enable sound" button
                    // or rely on subsequent notifications after interaction.
                });
            }
        } else {
            // If notification is hidden, pause the audio and reset its time
            audioElement.pause();
            audioElement.currentTime = 0; // Reset to start for next time
            audioElement.loop = false; // Explicitly turn off loop when not showing
        }

        // No cleanup function needed here because the pause() handles stopping.
    }, [isShowingNotification]);

    // --- Function to display the next notification from the queue ---
    // Use useCallback because it's used as a dependency in a useEffect later
    const showNextNotification = useCallback(() => {
        // Clear any previous timer if you were using auto-dismiss
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
            notificationTimerRef.current = null;
        }

        setNotificationQueue(prevQueue => {
            if (prevQueue.length > 0) {
                const [nextOrder, ...remainingQueue] = prevQueue; // Get first item, rest of queue
                console.log(`[AdminLayout] Showing notification for Order #${nextOrder.orderNumber}. Queue size now: ${remainingQueue.length}`);
                setCurrentNotification(nextOrder); // Set the data for the alert component
                setIsShowingNotification(true);    // Make the alert component visible

                // Optional: Set a timer for auto-dismissal if desired
                // notificationTimerRef.current = setTimeout(() => {
                //     console.log(`[AdminLayout] Auto-dismissing Order #${nextOrder.orderNumber}`);
                //     handleDismissNotification(); // Call dismiss handler automatically
                // }, 15000); // 15 seconds example

                return remainingQueue; // Return the updated queue (without the shown item)
            } else {
                // Queue is empty
                console.log('[AdminLayout] Notification queue empty, ensuring alert is hidden.');
                setCurrentNotification(null);     // Clear current notification data
                setIsShowingNotification(false); // Ensure alert is hidden
                return [];                        // Return empty array for state
            }
        });
    }, []); // No dependencies needed for this specific callback


    // --- Effect for Socket.IO Connection & Event Handling ---
    useEffect(() => {
        let isSocketMounted = true;

        if (currentUser?._id) {
            const setupSocketConnection = () => {
                // Prevent duplicate connections
                if (socket && socket.connected) {
                    console.log('[AdminLayout Socket] Already connected:', socket.id);
                    const restaurantId = currentUser._id;
                    console.log(`[AdminLayout Socket] Re-emitting join for room: restaurant_${restaurantId}`);
                    socket.emit('join_restaurant_room', restaurantId);
                    return;
                }
                if (socket) {
                    socket.disconnect();
                }

                console.log('[AdminLayout Socket] User loaded, attempting to connect socket...');
                const socketUrl = axiosInstance.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000';
                socket = io(socketUrl); // Use default transports

                // --- Socket Event Handlers ---
                socket.on('connect', () => {
                    if (!isSocketMounted) return;
                    console.log(`[AdminLayout Socket] Connected: ${socket.id}. Attempting to join room...`);
                    const restaurantIdToJoin = currentUser?._id;
                    console.log('[AdminLayout Socket] Current user ID for joining:', restaurantIdToJoin);
                    if (restaurantIdToJoin) {
                        socket.emit('join_restaurant_room', restaurantIdToJoin);
                        console.log(`[AdminLayout Socket] --->>> EMITTED 'join_restaurant_room' for ID: ${restaurantIdToJoin}`);
                    } else {
                        console.warn('[AdminLayout Socket] XXX Cannot join room: currentUser._id is missing or invalid.');
                    }
                });

                socket.on('disconnect', (reason) => { if (isSocketMounted) console.log('[AdminLayout Socket] Disconnected:', reason) });
                socket.on('connect_error', (err) => { if (isSocketMounted) console.error('[AdminLayout Socket] Connection Error:', err.message) });

                // --- New Order Listener (Adds to Queue) ---
                socket.off('new_order'); // Prevent duplicate listeners
                socket.on('new_order', (newOrderData) => {
                    if (!isSocketMounted) return;
                    console.log(`%c[AdminLayout Socket] ---->>>> new_order EVENT RECEIVED`, 'color: lime; font-weight: bold;', newOrderData);

                    if (newOrderData && typeof newOrderData === 'object' && newOrderData._id) {
                        // Add received order to the notification queue state
                        setNotificationQueue(prevQueue => {
                            console.log(`[AdminLayout] Adding Order #${newOrderData.orderNumber} to queue. Current queue size: ${prevQueue.length}`);
                            // Optional: Add logic here to prevent adding duplicate order IDs to the queue if needed
                            return [...prevQueue, newOrderData];
                        });

                        // Play notification sound
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            const playPromise = audioRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(error => {
                                    if (error.name === 'NotAllowedError') {
                                        console.warn("Audio play() blocked by browser autoplay policy. User interaction needed.");
                                    } else if (error.name === 'NotSupportedError') {
                                        console.error("Audio play() failed: NotSupportedError. Check path/format. src:", audioRef.current.src, error);
                                    } else {
                                        console.error("Audio play failed unexpectedly:", error);
                                    }
                                });
                            }
                        }
                    } else {
                        console.warn('[AdminLayout Socket] Layout: Received invalid new_order data.');
                    }
                });
                console.log('[AdminLayout Socket] Listeners attached.');
            };

            setupSocketConnection();

        } else if (!currentUser?._id && socket?.connected) {
            // Disconnect if user logs out or profile fails
            console.log('[AdminLayout Socket] Disconnecting socket - no current user.');
            socket.disconnect();
            socket = null;
        }

        // --- Cleanup Function ---
        return () => {
            isSocketMounted = false;
            console.log('[AdminLayout Socket] Layout cleanup executing.');
            // Clear any pending notification timeout
            if (notificationTimerRef.current) {
                clearTimeout(notificationTimerRef.current);
                notificationTimerRef.current = null;
            }
            if (socket) {
                console.log('[AdminLayout Socket] Removing new_order listener in cleanup.');
                socket.off('new_order');
                // Disconnect if component unmounts
                if (socket.connected) {
                    console.log('[AdminLayout Socket] Disconnecting socket in cleanup.');
                    socket.disconnect();
                }
                socket = null;
            }
        };
    }, [currentUser]); // Re-run effect if currentUser changes

    // --- Effect to Process the Notification Queue ---
    useEffect(() => {
        // If no notification is currently being shown, but there are items in the queue,
        // trigger the display of the next one.
        if (!isShowingNotification && notificationQueue.length > 0) {
            showNextNotification();
        }
        // This effect depends on the queue itself and the visibility state.
        // It also depends on the showNextNotification function (which is memoized with useCallback).
    }, [notificationQueue, isShowingNotification, showNextNotification]);

    // --- Handler for Dismissing/Acknowledging the *Current* Notification ---
    // Renamed from handleAcknowledgeAlert to be more specific
    const handleDismissNotification = (action = 'dismiss') => {
        console.log(`[AdminLayout] Handling action: ${action} for current notification ID:`, currentNotification?._id);

        // Clear any auto-dismiss timer associated with the current notification
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
            notificationTimerRef.current = null;
        }

        // Hide the current alert
        setIsShowingNotification(false);
        const dismissedOrderId = currentNotification?._id; // Get ID before clearing
        setCurrentNotification(null); // Clear the data for the current alert



        // Stop audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Navigate if the action requires it
        if (action === 'acknowledge') {
            console.log('[AdminLayout] Acknowledged. Navigating to /orders?status=new');
            navigate('/orders?status=new', { replace: true });
        }

        // IMPORTANT: Attempt to show the next notification from the queue shortly after
        // This ensures the next alert pops up after the current one is dismissed/acknowledged
        // Using a timeout allows exit animations to start smoothly.
        setTimeout(() => {
            console.log(`[AdminLayout] Attempting to show next notification after handling ${dismissedOrderId}`);
            showNextNotification();
        }, 300); // Adjust timing if needed (e.g., match NotificationAlert exit animation)
    };

    // --- Loading and Auth Checks ---
    if (isAuthLoading) {
        return <div className="h-screen flex items-center justify-center"><LoadingSpinner message="Loading Session..." /></div>;
    }

    if (!currentUser) {
        console.log("AdminLayout: No current user, rendering null (redirect handled elsewhere).");
        return null; // Don't render children if no user context
    }

    // --- Render Layout ---
    return (
        <div className="flex h-screen bg-gray-100">
            {/* Replace with your actual Sidebar component if needed */}
            {/* <AdminSidebar /> */}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Replace with your actual Header component if needed */}
                {/* <AdminHeader /> */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                    {/* Child routes (like Orders, Dashboard) render here */}
                    <Outlet />
                </main>
            </div>

            {/* Persistent Notification Alert (Uses new state) */}
            <NotificationAlert
                orderData={currentNotification}   // Data comes from currentNotification state
                show={isShowingNotification}      // Visibility controlled by isShowingNotification state
                onDismiss={handleDismissNotification} // Uses the new handler
            />

            {/* Hidden Audio Element */}
            {/* Ensure notification.mp3 is in the /public folder of your frontend project */}
            <audio ref={audioRef} src="/notification.mp3" preload="auto" loop></audio>
        </div>
    );
};

export default AdminLayout;
