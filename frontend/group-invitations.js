// =====================================================
// GROUP INVITATIONS MANAGER
// Sistema completo de invitaciones a grupos privados
// =====================================================

class GroupInvitationsManager {
    constructor() {
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://tu-dominio.vercel.app';
    }

    // Obtener token de sesión actual
    async getSessionToken() {
        const session = await supabase.auth.getSession();
        if (!session?.data?.session?.access_token) {
            throw new Error('No hay sesión activa');
        }
        return session.data.session.access_token;
    }

    // =====================================================
    // CREAR INVITACIONES
    // =====================================================

    /**
     * Crear invitación por email
     */
    async inviteByEmail(groupId, email, expiryHours = 168) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(`${this.apiBaseUrl}/api/group-invitations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    group_id: groupId,
                    invited_email: email,
                    expiry_hours: expiryHours
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error invitando por email:', error);
            throw error;
        }
    }

    /**
     * Crear invitación por user ID (para usuarios registrados)
     */
    async inviteByUserId(groupId, userId, expiryHours = 168) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(`${this.apiBaseUrl}/api/group-invitations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    group_id: groupId,
                    invited_user_id: userId,
                    expiry_hours: expiryHours
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al crear invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error invitando por user ID:', error);
            throw error;
        }
    }

    // =====================================================
    // OBTENER INVITACIONES
    // =====================================================

    /**
     * Obtener invitaciones recibidas por el usuario actual
     */
    async getReceivedInvitations() {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(
                `${this.apiBaseUrl}/api/group-invitations?type=received`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al obtener invitaciones');
            }

            return await response.json();
        } catch (error) {
            console.error('Error obteniendo invitaciones recibidas:', error);
            throw error;
        }
    }

    /**
     * Obtener invitaciones de un grupo específico
     */
    async getGroupInvitations(groupId) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(
                `${this.apiBaseUrl}/api/group-invitations?group_id=${groupId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al obtener invitaciones');
            }

            return await response.json();
        } catch (error) {
            console.error('Error obteniendo invitaciones del grupo:', error);
            throw error;
        }
    }

    /**
     * Obtener invitación por token
     */
    async getInvitationByToken(token) {
        try {
            const sessionToken = await this.getSessionToken();
            const response = await fetch(
                `${this.apiBaseUrl}/api/group-invitations?token=${token}`,
                {
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al obtener invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error obteniendo invitación:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las invitaciones enviadas por el usuario
     */
    async getSentInvitations() {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(
                `${this.apiBaseUrl}/api/group-invitations`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al obtener invitaciones');
            }

            return await response.json();
        } catch (error) {
            console.error('Error obteniendo invitaciones enviadas:', error);
            throw error;
        }
    }

    // =====================================================
    // ACEPTAR/RECHAZAR INVITACIONES
    // =====================================================

    /**
     * Aceptar invitación
     */
    async acceptInvitation(invitationToken) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(`${this.apiBaseUrl}/api/group-invitations`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    token: invitationToken,
                    action: 'accept'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al aceptar invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error aceptando invitación:', error);
            throw error;
        }
    }

    /**
     * Rechazar invitación
     */
    async rejectInvitation(invitationToken) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(`${this.apiBaseUrl}/api/group-invitations`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    token: invitationToken,
                    action: 'reject'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al rechazar invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error rechazando invitación:', error);
            throw error;
        }
    }

    // =====================================================
    // CANCELAR/REVOCAR INVITACIONES
    // =====================================================

    /**
     * Cancelar/revocar invitación
     */
    async cancelInvitation(invitationId) {
        try {
            const token = await this.getSessionToken();
            const response = await fetch(
                `${this.apiBaseUrl}/api/group-invitations?id=${invitationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al cancelar invitación');
            }

            return await response.json();
        } catch (error) {
            console.error('Error cancelando invitación:', error);
            throw error;
        }
    }

    // =====================================================
    // UTILIDADES
    // =====================================================

    /**
     * Generar enlace de invitación
     */
    generateInvitationLink(token) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/?invite=${token}`;
    }

    /**
     * Copiar enlace de invitación al portapapeles
     */
    async copyInvitationLink(token) {
        const link = this.generateInvitationLink(token);
        try {
            await navigator.clipboard.writeText(link);
            return link;
        } catch (error) {
            console.error('Error copiando al portapapeles:', error);
            throw error;
        }
    }

    /**
     * Formatear tiempo restante para expiración
     */
    formatTimeRemaining(expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry - now;

        if (diff <= 0) {
            return 'Expirada';
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Verificar si hay invitación en la URL
     */
    checkInvitationInURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('invite');
    }

    /**
     * Procesar invitación desde URL automáticamente
     */
    async processInvitationFromURL() {
        const token = this.checkInvitationInURL();
        if (!token) {
            return null;
        }

        try {
            // Obtener detalles de la invitación
            const invitation = await this.getInvitationByToken(token);
            
            // Mostrar modal o UI para aceptar/rechazar
            return {
                token,
                invitation,
                accept: () => this.acceptInvitation(token),
                reject: () => this.rejectInvitation(token)
            };
        } catch (error) {
            console.error('Error procesando invitación desde URL:', error);
            throw error;
        }
    }
}

// =====================================================
// UI HELPERS
// =====================================================

/**
 * Renderizar modal de invitación
 */
function showInvitationModal(invitation, onAccept, onReject) {
    const modal = document.createElement('div');
    modal.className = 'invitation-modal';
    modal.innerHTML = `
        <div class="invitation-modal-overlay">
            <div class="invitation-modal-content">
                <div class="invitation-header">
                    <span class="group-emoji">${invitation.group.emoji}</span>
                    <h3>Invitación a Grupo</h3>
                </div>
                
                <div class="invitation-body">
                    <p class="group-name">${invitation.group.name}</p>
                    <p class="group-description">${invitation.group.description || ''}</p>
                    <p class="invitation-from">
                        Invitado por: <strong>${invitation.inviter.raw_user_meta_data?.display_name || invitation.inviter.email}</strong>
                    </p>
                    <p class="invitation-expires">
                        Expira: ${new GroupInvitationsManager().formatTimeRemaining(invitation.expires_at)}
                    </p>
                </div>
                
                <div class="invitation-actions">
                    <button class="btn btn-secondary" id="rejectInvite">Rechazar</button>
                    <button class="btn btn-primary" id="acceptInvite">Aceptar</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('#acceptInvite').addEventListener('click', async () => {
        try {
            await onAccept();
            modal.remove();
        } catch (error) {
            alert('Error al aceptar invitación: ' + error.message);
        }
    });

    modal.querySelector('#rejectInvite').addEventListener('click', async () => {
        try {
            await onReject();
            modal.remove();
        } catch (error) {
            alert('Error al rechazar invitación: ' + error.message);
        }
    });

    modal.querySelector('.invitation-modal-overlay').addEventListener('click', (e) => {
        if (e.target === modal.querySelector('.invitation-modal-overlay')) {
            modal.remove();
        }
    });
}

/**
 * Renderizar lista de invitaciones pendientes
 */
function renderInvitationsList(invitations, container) {
    if (!invitations || invitations.length === 0) {
        container.innerHTML = '<p class="no-invitations">No tienes invitaciones pendientes</p>';
        return;
    }

    const invitationsManager = new GroupInvitationsManager();

    container.innerHTML = invitations.map(inv => `
        <div class="invitation-card" data-id="${inv.id}">
            <div class="invitation-info">
                <span class="group-emoji">${inv.group.emoji}</span>
                <div class="invitation-details">
                    <h4>${inv.group.name}</h4>
                    <p class="invitation-from">De: ${inv.inviter.raw_user_meta_data?.display_name || inv.inviter.email}</p>
                    <p class="invitation-expires">Expira en: ${invitationsManager.formatTimeRemaining(inv.expires_at)}</p>
                </div>
            </div>
            <div class="invitation-actions">
                <button class="btn btn-sm btn-secondary" onclick="handleRejectInvitation('${inv.invitation_token}', '${inv.id}')">
                    Rechazar
                </button>
                <button class="btn btn-sm btn-primary" onclick="handleAcceptInvitation('${inv.invitation_token}', '${inv.id}')">
                    Aceptar
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Handlers globales para aceptar/rechazar
 */
async function handleAcceptInvitation(token, invitationId) {
    const manager = new GroupInvitationsManager();
    try {
        await manager.acceptInvitation(token);
        showNotification('¡Te has unido al grupo!', 'success');
        
        // Recargar la lista de invitaciones
        document.querySelector(`[data-id="${invitationId}"]`)?.remove();
    } catch (error) {
        showNotification('Error al aceptar: ' + error.message, 'error');
    }
}

async function handleRejectInvitation(token, invitationId) {
    const manager = new GroupInvitationsManager();
    try {
        await manager.rejectInvitation(token);
        showNotification('Invitación rechazada', 'info');
        
        // Recargar la lista de invitaciones
        document.querySelector(`[data-id="${invitationId}"]`)?.remove();
    } catch (error) {
        showNotification('Error al rechazar: ' + error.message, 'error');
    }
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =====================================================
// AUTO-INICIALIZACIÓN
// =====================================================

// Procesar invitación desde URL al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    const manager = new GroupInvitationsManager();
    
    try {
        const invitationData = await manager.processInvitationFromURL();
        
        if (invitationData) {
            showInvitationModal(
                invitationData.invitation,
                invitationData.accept,
                invitationData.reject
            );
        }
    } catch (error) {
        if (error.message !== 'No hay sesión activa') {
            console.error('Error procesando invitación:', error);
        }
    }
});

// Exportar para uso global
window.GroupInvitationsManager = GroupInvitationsManager;
window.showInvitationModal = showInvitationModal;
window.renderInvitationsList = renderInvitationsList;

// =====================================================
// PROCESAMIENTO DE INVITACIONES DESDE URL
// Sistema directo con Supabase (sin API endpoints)
// =====================================================

/**
 * Procesar invitación de grupo al cargar la página
 * Se ejecuta después de que el usuario haya iniciado sesión
 */
async function processGroupInvitation() {
    // Solo procesar si hay un token de invitación
    if (!window.GROUP_INVITE_TOKEN) {
        return;
    }

    console.log('🎟️ Procesando invitación de grupo desde URL...');

    try {
        // Verificar si el usuario está autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.log('⚠️ Usuario no autenticado. Guardando invitación para después del login...');
            
            // Guardar el token para procesarlo después del login
            sessionStorage.setItem('pending_group_invite', window.GROUP_INVITE_TOKEN);
            
            // Mostrar mensaje para que inicie sesión
            showNotification('Por favor inicia sesión para aceptar la invitación al grupo', 'info');
            return;
        }

        // Usuario autenticado - procesar invitación
        await acceptGroupInvitationDirect(window.GROUP_INVITE_TOKEN, user.id);

    } catch (error) {
        console.error('❌ Error procesando invitación:', error);
        showNotification('Error al procesar la invitación', 'error');
    }
}

/**
 * Aceptar una invitación de grupo (método directo con Supabase)
 * @param {string} inviteToken - Token único de la invitación
 * @param {string} userId - ID del usuario que acepta
 */
async function acceptGroupInvitationDirect(inviteToken, userId) {
    try {
        console.log('📥 Aceptando invitación con token:', inviteToken);

        // 1. Buscar la invitación
        const { data: invitation, error: inviteError } = await supabase
            .from('group_invitations')
            .select(`
                *,
                group:trading_groups!group_invitations_group_id_fkey(id, name, emoji),
                inviter:auth.users!group_invitations_invited_by_fkey(id, email, raw_user_meta_data)
            `)
            .eq('invitation_token', inviteToken)
            .eq('status', 'pending')
            .single();

        if (inviteError || !invitation) {
            console.error('❌ Invitación no encontrada o ya utilizada:', inviteError);
            showNotification('La invitación no es válida o ya expiró', 'error');
            
            // Limpiar token de la URL
            clearInviteTokenFromURL();
            return;
        }

        // 2. Verificar si la invitación no ha expirado
        const expiresAt = new Date(invitation.expires_at);
        const now = new Date();

        if (now > expiresAt) {
            console.log('⏰ Invitación expirada');
            
            // Marcar como expirada
            await supabase
                .from('group_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id);

            showNotification('Esta invitación ha expirado', 'error');
            clearInviteTokenFromURL();
            return;
        }

        // 3. Verificar si el usuario ya es miembro
        const { data: existingMember } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', invitation.group_id)
            .eq('user_id', userId)
            .single();

        if (existingMember) {
            console.log('✅ Usuario ya es miembro del grupo');
            const groupName = invitation.group?.name || 'el grupo';
            showNotification(`Ya eres miembro de ${groupName}`, 'info');
            
            // Marcar invitación como aceptada
            await supabase
                .from('group_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id);

            clearInviteTokenFromURL();
            
            // Ir a Social Media
            if (typeof showSection === 'function') {
                showSection('social-media');
            }
            return;
        }

        // 4. Agregar usuario al grupo
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: invitation.group_id,
                user_id: userId,
                role: 'member'
            });

        if (memberError) {
            console.error('❌ Error al agregar usuario al grupo:', memberError);
            showNotification('Error al unirse al grupo', 'error');
            return;
        }

        // 5. Marcar invitación como aceptada
        await supabase
            .from('group_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);

        console.log('✅ Usuario agregado al grupo exitosamente');

        // 6. Mostrar mensaje de éxito
        const groupEmoji = invitation.group?.emoji || '📊';
        const groupName = invitation.group?.name || 'el grupo';
        
        showNotification(`${groupEmoji} ¡Te uniste a ${groupName}!`, 'success');

        // 7. Limpiar token de la URL
        clearInviteTokenFromURL();

        // 8. Recargar grupos y cambiar a Social Media
        if (typeof loadMyGroups === 'function') {
            await loadMyGroups();
        }
        
        if (typeof showSection === 'function') {
            showSection('social-media');
        }

    } catch (error) {
        console.error('❌ Error en acceptGroupInvitationDirect:', error);
        showNotification('Error al procesar la invitación', 'error');
    }
}

/**
 * Limpiar el token de invitación de la URL
 */
function clearInviteTokenFromURL() {
    try {
        // Limpiar de sessionStorage
        sessionStorage.removeItem('pending_group_invite');
        
        // Limpiar de la URL sin recargar
        const url = new URL(window.location);
        url.searchParams.delete('invite');
        window.history.replaceState({}, '', url);
        
        // Limpiar variable global
        window.GROUP_INVITE_TOKEN = null;
        
        console.log('🧹 Token de invitación limpiado de la URL');
    } catch (error) {
        console.error('Error limpiando token:', error);
    }
}

/**
 * Procesar invitaciones pendientes después del login
 * Se ejecuta automáticamente después de un login exitoso
 */
async function processPendingInvitation() {
    const pendingToken = sessionStorage.getItem('pending_group_invite');
    
    if (!pendingToken) {
        return;
    }

    console.log('🔄 Procesando invitación pendiente después de login...');

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.log('⚠️ No hay usuario autenticado');
        return;
    }

    // Procesar la invitación
    await acceptGroupInvitationDirect(pendingToken, user.id);
}

// Exportar funciones para que estén disponibles globalmente
window.processGroupInvitation = processGroupInvitation;
window.processPendingInvitation = processPendingInvitation;
window.acceptGroupInvitationDirect = acceptGroupInvitationDirect;
window.clearInviteTokenFromURL = clearInviteTokenFromURL;

console.log('✅ Sistema de procesamiento de invitaciones cargado (método directo Supabase)');
