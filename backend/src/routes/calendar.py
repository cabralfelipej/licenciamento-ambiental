from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.licenciamento import Condicionante, Notificacao
from src.services.google_calendar import criar_evento_condicionante, atualizar_evento_condicionante, deletar_evento_condicionante
from datetime import datetime

calendar_bp = Blueprint('calendar', __name__)

@calendar_bp.route('/calendar/sync-condicionante/<int:condicionante_id>', methods=['POST'])
def sincronizar_condicionante(condicionante_id):
    """Sincroniza uma condicionante específica com o Google Calendar"""
    try:
        condicionante = Condicionante.query.get_or_404(condicionante_id)
        empresa_nome = condicionante.licenca.empresa.razao_social
        
        # Verifica se já existe uma notificação de calendar para esta condicionante
        notificacao_existente = Notificacao.query.filter_by(
            condicionante_id=condicionante_id,
            tipo='calendar'
        ).first()
        
        if notificacao_existente and notificacao_existente.google_event_id:
            # Atualiza evento existente
            sucesso = atualizar_evento_condicionante(
                notificacao_existente.google_event_id,
                condicionante,
                empresa_nome
            )
            
            if sucesso:
                notificacao_existente.status = 'enviada'
                notificacao_existente.data_envio = datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'mensagem': 'Evento atualizado no Google Calendar',
                    'event_id': notificacao_existente.google_event_id
                }), 200
            else:
                return jsonify({'erro': 'Falha ao atualizar evento no Google Calendar'}), 500
        else:
            # Cria novo evento
            event_id = criar_evento_condicionante(condicionante, empresa_nome)
            
            if event_id:
                # Cria ou atualiza notificação
                if notificacao_existente:
                    notificacao_existente.google_event_id = event_id
                    notificacao_existente.status = 'enviada'
                    notificacao_existente.data_envio = datetime.utcnow()
                else:
                    notificacao = Notificacao(
                        condicionante_id=condicionante_id,
                        tipo='calendar',
                        google_event_id=event_id,
                        status='enviada',
                        data_envio=datetime.utcnow(),
                        mensagem=f'Evento criado para: {condicionante.descricao[:50]}...'
                    )
                    db.session.add(notificacao)
                
                db.session.commit()
                
                return jsonify({
                    'mensagem': 'Evento criado no Google Calendar',
                    'event_id': event_id
                }), 201
            else:
                return jsonify({'erro': 'Falha ao criar evento no Google Calendar'}), 500
                
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@calendar_bp.route('/calendar/sync-all', methods=['POST'])
def sincronizar_todas_condicionantes():
    """Sincroniza todas as condicionantes pendentes com o Google Calendar"""
    try:
        # Busca todas as condicionantes pendentes que têm data limite
        condicionantes = Condicionante.query.filter(
            Condicionante.status == 'pendente',
            Condicionante.data_limite.isnot(None)
        ).all()
        
        eventos_criados = 0
        eventos_atualizados = 0
        erros = 0
        
        for condicionante in condicionantes:
            empresa_nome = condicionante.licenca.empresa.razao_social
            
            # Verifica se já existe notificação
            notificacao_existente = Notificacao.query.filter_by(
                condicionante_id=condicionante.id,
                tipo='calendar'
            ).first()
            
            if notificacao_existente and notificacao_existente.google_event_id:
                # Atualiza evento existente
                sucesso = atualizar_evento_condicionante(
                    notificacao_existente.google_event_id,
                    condicionante,
                    empresa_nome
                )
                if sucesso:
                    eventos_atualizados += 1
                    notificacao_existente.status = 'enviada'
                    notificacao_existente.data_envio = datetime.utcnow()
                else:
                    erros += 1
            else:
                # Cria novo evento
                event_id = criar_evento_condicionante(condicionante, empresa_nome)
                
                if event_id:
                    eventos_criados += 1
                    
                    if notificacao_existente:
                        notificacao_existente.google_event_id = event_id
                        notificacao_existente.status = 'enviada'
                        notificacao_existente.data_envio = datetime.utcnow()
                    else:
                        notificacao = Notificacao(
                            condicionante_id=condicionante.id,
                            tipo='calendar',
                            google_event_id=event_id,
                            status='enviada',
                            data_envio=datetime.utcnow(),
                            mensagem=f'Evento criado para: {condicionante.descricao[:50]}...'
                        )
                        db.session.add(notificacao)
                else:
                    erros += 1
        
        db.session.commit()
        
        return jsonify({
            'mensagem': 'Sincronização concluída',
            'eventos_criados': eventos_criados,
            'eventos_atualizados': eventos_atualizados,
            'erros': erros,
            'total_processados': len(condicionantes)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@calendar_bp.route('/calendar/remove-condicionante/<int:condicionante_id>', methods=['DELETE'])
def remover_evento_condicionante(condicionante_id):
    """Remove um evento de condicionante do Google Calendar"""
    try:
        # Busca a notificação de calendar para esta condicionante
        notificacao = Notificacao.query.filter_by(
            condicionante_id=condicionante_id,
            tipo='calendar'
        ).first()
        
        if not notificacao or not notificacao.google_event_id:
            return jsonify({'erro': 'Evento não encontrado no Google Calendar'}), 404
        
        # Remove o evento do Google Calendar
        sucesso = deletar_evento_condicionante(notificacao.google_event_id)
        
        if sucesso:
            # Remove a notificação do banco
            db.session.delete(notificacao)
            db.session.commit()
            
            return jsonify({'mensagem': 'Evento removido do Google Calendar'}), 200
        else:
            return jsonify({'erro': 'Falha ao remover evento do Google Calendar'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@calendar_bp.route('/calendar/status', methods=['GET'])
def status_sincronizacao():
    """Retorna o status da sincronização com o Google Calendar"""
    try:
        # Conta condicionantes por status de sincronização
        total_condicionantes = Condicionante.query.filter(
            Condicionante.status == 'pendente',
            Condicionante.data_limite.isnot(None)
        ).count()
        
        sincronizadas = Notificacao.query.filter(
            Notificacao.tipo == 'calendar',
            Notificacao.status == 'enviada',
            Notificacao.google_event_id.isnot(None)
        ).count()
        
        nao_sincronizadas = total_condicionantes - sincronizadas
        
        # Busca últimas sincronizações
        ultimas_sincronizacoes = Notificacao.query.filter(
            Notificacao.tipo == 'calendar',
            Notificacao.status == 'enviada'
        ).order_by(Notificacao.data_envio.desc()).limit(5).all()
        
        return jsonify({
            'total_condicionantes': total_condicionantes,
            'sincronizadas': sincronizadas,
            'nao_sincronizadas': nao_sincronizadas,
            'percentual_sincronizado': round((sincronizadas / total_condicionantes * 100) if total_condicionantes > 0 else 0, 1),
            'ultimas_sincronizacoes': [
                {
                    'condicionante_id': n.condicionante_id,
                    'data_envio': n.data_envio.isoformat() if n.data_envio else None,
                    'event_id': n.google_event_id,
                    'mensagem': n.mensagem
                }
                for n in ultimas_sincronizacoes
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@calendar_bp.route('/calendar/config', methods=['GET'])
def configuracao_calendar():
    """Retorna informações sobre a configuração do Google Calendar"""
    return jsonify({
        'status': 'configurado',
        'modo': 'desenvolvimento',
        'observacao': 'Em modo de desenvolvimento, os eventos são simulados. Para produção, configure as credenciais OAuth2 do Google.',
        'funcionalidades': [
            'Criação de eventos para condicionantes',
            'Atualização automática de eventos',
            'Remoção de eventos quando condicionantes são cumpridas',
            'Lembretes automáticos (7, 3 e 1 dia antes)',
            'Sincronização em lote'
        ]
    }), 200

