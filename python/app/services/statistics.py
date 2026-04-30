"""
Servicio de estadísticas: cálculo de stats de jugadores y equipos.
"""
from collections import defaultdict
from app.utils.sport_config import PRIMARY_SCORING_SUPABASE_EVENTS, SUPABASE_EVENT_POINTS, SPORT_SCORE_TERM_MAP


def calculate_player_stats(players: list, teams: list, matches: list, events: list) -> list:
    """Calcula estadísticas completas de cada jugador."""
    team_map = {t["id"]: t for t in teams}
    player_map = {p["id"]: p for p in players}

    # Índice: player_id -> match_ids en que participó
    player_match_ids: dict[str, set] = defaultdict(set)
    for event in events:
        pid = event.get("player_id")
        if pid:
            player_match_ids[pid].add(event["match_id"])

    # Estadísticas por jugador
    stats_by_player: dict[str, dict] = {}

    for event in events:
        pid = event.get("player_id")
        if not pid:
            continue

        player = player_map.get(pid)
        if not player:
            continue

        team = team_map.get(player.get("team_id", ""), {})
        school_name = team.get("school", {}).get("name", "Desconocido") if isinstance(team.get("school"), dict) else "Desconocido"
        team_name = team.get("name", "Desconocido")
        category_name = team.get("category", {}).get("name", "") if isinstance(team.get("category"), dict) else ""
        gender_name = team.get("gender", "")
        team_sport = team.get("sport", {}).get("name", "") if isinstance(team.get("sport"), dict) else ""

        if pid not in stats_by_player:
            full_name = player.get("full_name") or "Desconocido"
            avatar_name = (player.get("full_name") or "?").replace(" ", "+")
            stats_by_player[pid] = {
                "player_id": pid,
                "name": full_name,
                "team_name": team_name,
                "team_id": player.get("team_id", ""),
                "school": school_name,
                "category": category_name,
                "gender": gender_name,
                "team_sport": team_sport,
                "photo": player.get("photo_url") or f"https://ui-avatars.com/api/?background=1e40af&color=fff&size=60&name={avatar_name}",
                "yellow_cards": 0,
                "red_cards": 0,
                "total_cards": 0,
                "matches_played": 0,
                "sport_stats": {},
            }

        entry = stats_by_player[pid]
        ev_type = event.get("event_type", "")

        if ev_type == "yellow_card":
            entry["yellow_cards"] += 1
            entry["total_cards"] += 1
        elif ev_type == "red_card":
            entry["red_cards"] += 1
            entry["total_cards"] += 1

        # Sport stats
        sport = event.get("sport", "")
        if not sport:
            # Buscar sport del partido
            match = next((m for m in matches if m["id"] == event["match_id"]), None)
            sport = match.get("sport", "") if match else ""

        if sport not in entry["sport_stats"]:
            entry["sport_stats"][sport] = {
                "sport": sport,
                "score": 0,
                "assists": 0,
                "score_term": SPORT_SCORE_TERM_MAP.get(sport, "Puntos"),
                "assist_term": "Asistencias",
                "three_pointers": 0,
                "personal_fouls": 0,
                "technical_fouls": 0,
                "blocks": 0,
                "aces_count": 0,
                "errors": 0,
            }

        sport_stat = entry["sport_stats"][sport]
        primary_events = PRIMARY_SCORING_SUPABASE_EVENTS.get(sport, [])

        if ev_type in primary_events:
            pts = SUPABASE_EVENT_POINTS.get(ev_type, 1)
            sport_stat["score"] += pts

        if ev_type in ("assist_football", "assist_basketball"):
            sport_stat["assists"] += 1
        if ev_type == "basket_3pts":
            sport_stat["three_pointers"] += 1
        if ev_type == "personal_foul":
            sport_stat["personal_fouls"] += 1
        if ev_type == "technical_foul":
            sport_stat["technical_fouls"] += 1
        if ev_type == "block":
            sport_stat["blocks"] += 1
        if ev_type == "ace":
            sport_stat["aces_count"] += 1
        if ev_type == "error_volleyball":
            sport_stat["errors"] += 1

    # Calcular matches_played
    for pid, entry in stats_by_player.items():
        entry["matches_played"] = len(player_match_ids.get(pid, set()))
        entry["sport_stats"] = list(entry["sport_stats"].values())

    return list(stats_by_player.values())


def calculate_team_stats(teams: list, matches: list) -> list:
    """Calcula la tabla de posiciones de equipos, separando por grupo A/B si existen."""
    stats: dict[str, dict] = {}

    # Detectar si hay información de fases (columnas group_name/phase presentes)
    has_phase = any(m.get("phase") is not None for m in matches)

    # Determinar a qué grupo pertenece cada equipo (desde partidos intragrupo)
    team_group: dict[str, str] = {}
    for match in matches:
        gname = match.get("group_name") or ""
        phase = match.get("phase") or ""
        if gname and gname != "Intergrupo" and phase != "intergroup":
            t1 = match.get("team_a") or match.get("team1_id")
            t2 = match.get("team_b") or match.get("team2_id")
            if t1 and t1 not in team_group:
                team_group[t1] = gname
            if t2 and t2 not in team_group:
                team_group[t2] = gname

    # Mapa rápido team_id → sport para saber si un partido es voleibol
    team_sport_map: dict[str, str] = {}
    for team in teams:
        sport_obj = team.get("sport", {})
        sname = sport_obj.get("name", "") if isinstance(sport_obj, dict) else str(sport_obj)
        team_sport_map[team["id"]] = sname

    for team in teams:
        tid = team["id"]
        school_name = team.get("school", {}).get("name", "Desconocido") if isinstance(team.get("school"), dict) else "Desconocido"
        category_name = team.get("category", {}).get("name", "") if isinstance(team.get("category"), dict) else ""
        sport_name = team.get("sport", {}).get("name", "") if isinstance(team.get("sport"), dict) else ""
        gender_name = team.get("category", {}).get("gender", "") if isinstance(team.get("category"), dict) else team.get("gender", "")

        # Grupo: usar el del equipo en BD si existe, si no el derivado de partidos
        group_from_team = team.get("group_name") or ""
        stats[tid] = {
            "team_id": tid,
            "team_name": team.get("name") or school_name,
            "school": school_name,
            "sport": sport_name,
            "category": category_name,
            "gender": gender_name,
            "group_name": group_from_team or team_group.get(tid, ""),
            "matches_played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
            "points_for": 0,
            "points_against": 0,
            "points_difference": 0,
            "points": 0,
        }

    # Deduplicar partidos por clave compuesta para evitar contar duplicados
    seen_match_keys: set[str] = set()
    unique_matches = []
    for match in matches:
        mid = match.get("id", "")
        t1 = match.get("team_a") or match.get("team1_id") or ""
        t2 = match.get("team_b") or match.get("team2_id") or ""
        md = (match.get("match_date") or "")[:16]
        key = f"{t1}|{t2}|{md}"
        if mid in seen_match_keys or key in seen_match_keys:
            continue
        if mid:
            seen_match_keys.add(mid)
        seen_match_keys.add(key)
        unique_matches.append(match)

    for match in unique_matches:
        if match.get("status") != "finished":
            continue

        # Los partidos de playoff no cuentan en la tabla de grupos
        if has_phase and match.get("phase") == "playoff":
            continue

        t1_id = match.get("team_a") or match.get("team1_id")
        t2_id = match.get("team_b") or match.get("team2_id")
        s1 = match.get("team1_score") or 0
        s2 = match.get("team2_score") or 0

        # Detectar deporte del partido a través del equipo
        match_sport = team_sport_map.get(t1_id, "") or team_sport_map.get(t2_id, "")

        if match_sport == "Voleibol":
            # Voleibol: s1/s2 son SETS ganados (solo 2-0 ó 2-1 válidos)
            # 2-0 → ganador +3pts, perdedor +0pts
            # 2-1 → ganador +2pts, perdedor +1pt
            p1 = match.get("team1_points") or 0
            p2 = match.get("team2_points") or 0

            if t1_id in stats:
                stats[t1_id]["matches_played"] += 1
                stats[t1_id]["goals_for"]      += s1
                stats[t1_id]["goals_against"]  += s2
                stats[t1_id]["points_for"]     += p1
                stats[t1_id]["points_against"] += p2
                if s1 > s2:
                    stats[t1_id]["wins"]   += 1
                    stats[t1_id]["points"] += 3 if s2 == 0 else 2
                else:
                    stats[t1_id]["losses"] += 1
                    stats[t1_id]["points"] += 0 if s1 == 0 else 1

            if t2_id in stats:
                stats[t2_id]["matches_played"] += 1
                stats[t2_id]["goals_for"]      += s2
                stats[t2_id]["goals_against"]  += s1
                stats[t2_id]["points_for"]     += p2
                stats[t2_id]["points_against"] += p1
                if s2 > s1:
                    stats[t2_id]["wins"]   += 1
                    stats[t2_id]["points"] += 3 if s1 == 0 else 2
                else:
                    stats[t2_id]["losses"] += 1
                    stats[t2_id]["points"] += 0 if s2 == 0 else 1

        elif match_sport in ("Baloncesto", "Softball"):
            # Baloncesto / Softball: no hay empates, ganador +3pts, perdedor +0pts
            if t1_id in stats:
                stats[t1_id]["matches_played"] += 1
                stats[t1_id]["goals_for"]      += s1
                stats[t1_id]["goals_against"]  += s2
                if s1 > s2:
                    stats[t1_id]["wins"]   += 1
                    stats[t1_id]["points"] += 3
                else:
                    stats[t1_id]["losses"] += 1

            if t2_id in stats:
                stats[t2_id]["matches_played"] += 1
                stats[t2_id]["goals_for"]      += s2
                stats[t2_id]["goals_against"]  += s1
                if s2 > s1:
                    stats[t2_id]["wins"]   += 1
                    stats[t2_id]["points"] += 3
                else:
                    stats[t2_id]["losses"] += 1

        else:
            # Fútbol y demás: 3 puntos por victoria, 1 por empate
            if t1_id in stats:
                stats[t1_id]["matches_played"] += 1
                stats[t1_id]["goals_for"]      += s1
                stats[t1_id]["goals_against"]  += s2
                if s1 > s2:
                    stats[t1_id]["wins"]   += 1
                    stats[t1_id]["points"] += 3
                elif s1 == s2:
                    stats[t1_id]["draws"]  += 1
                    stats[t1_id]["points"] += 1
                else:
                    stats[t1_id]["losses"] += 1

            if t2_id in stats:
                stats[t2_id]["matches_played"] += 1
                stats[t2_id]["goals_for"]      += s2
                stats[t2_id]["goals_against"]  += s1
                if s2 > s1:
                    stats[t2_id]["wins"]   += 1
                    stats[t2_id]["points"] += 3
                elif s1 == s2:
                    stats[t2_id]["draws"]  += 1
                    stats[t2_id]["points"] += 1
                else:
                    stats[t2_id]["losses"] += 1

    result = list(stats.values())
    for s in result:
        s["goal_difference"] = s["goals_for"] - s["goals_against"]
        s["points_difference"] = s["points_for"] - s["points_against"]
        # Coeficientes solo para voleibol (sets ganados/perdidos, puntos a favor/en contra)
        if s.get("sport") == "Voleibol":
            sg, sp = s["goals_for"], s["goals_against"]
            pf, pc = s["points_for"], s["points_against"]
            s["set_ratio"] = sg / sp if sp > 0 else (999.0 if sg > 0 else 0.0)
            s["points_ratio"] = pf / pc if pc > 0 else (999.0 if pf > 0 else 0.0)
        else:
            s["set_ratio"] = 0.0
            s["points_ratio"] = 0.0

    # Desempate: PTS → coef. sets → coef. puntos → dif. goles → goles a favor
    # Para no-voleibol: set_ratio y points_ratio son 0, así que cae a goal_difference
    result.sort(key=lambda x: (-x["points"], -x.get("set_ratio", 0), -x.get("points_ratio", 0), -x["goal_difference"], -x["goals_for"]))
    return result
