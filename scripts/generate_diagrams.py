#!/usr/bin/env python3
"""
Generate 4 architecture diagrams for UPAS (Underground Protection Analysis System).
All diagrams use English labels, blue/navy color scheme, and are saved as PNG.
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.font_manager as fm
import matplotlib.patheffects as pe

# ── Font Setup ─────────────────────────────────────────────────────────────────
NOTO_PATH = "/usr/share/fonts/truetype/chinese/NotoSansSC[wght].ttf"
DEJAVU_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DEJAVU_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Try to use Noto Sans SC, fall back to DejaVu Sans
try:
    fm.fontManager.addfont(NOTO_PATH)
    FONT_NAME = "NotoSansSC"
    # test it
    _test = fm.FontProperties(fname=NOTO_PATH)
    FONT_NAME = _test.get_name()
except Exception:
    FONT_NAME = "DejaVu Sans"

FONT_BOLD_NAME = FONT_NAME  # same family, we'll use weight parameter

# ── Color Palette ──────────────────────────────────────────────────────────────
C_DARK_NAVY   = "#1a365d"
C_NAVY        = "#2a5298"
C_BLUE        = "#4a7ac7"
C_LIGHT_BLUE  = "#dce6f5"
C_PALE_BLUE   = "#f5f8fc"
C_WHITE       = "#ffffff"
C_ARROW       = "#2a5298"
C_TEXT_DARK   = "#1a365d"
C_TEXT_MED    = "#2a5298"
C_ACCENT      = "#3b82f6"
C_BORDER      = "#2a5298"
C_SUBTLE      = "#94a3b8"
C_GREEN       = "#10b981"
C_ORANGE      = "#f59e0b"

# ── Shared Helpers ─────────────────────────────────────────────────────────────
OUTPUT_DIR = "/home/z/my-project/download/diagrams"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DPI = 200


def get_font(size=10, weight="normal"):
    """Return FontProperties with the chosen font."""
    return fm.FontProperties(fname=DEJAVU_BOLD_PATH if weight == "bold" else DEJAVU_PATH, size=size)


def draw_rounded_box(ax, x, y, w, h, label, sublabel=None,
                     facecolor=C_LIGHT_BLUE, edgecolor=C_NAVY, linewidth=1.5,
                     fontsize=11, sublabel_size=9, text_color=C_TEXT_DARK):
    """Draw a rounded rectangle with centered text."""
    box = FancyBboxPatch(
        (x - w / 2, y - h / 2), w, h,
        boxstyle="round,pad=0.15",
        facecolor=facecolor, edgecolor=edgecolor, linewidth=linewidth,
        zorder=2
    )
    ax.add_patch(box)
    if sublabel:
        ax.text(x, y + 0.12 * h, label, ha="center", va="center",
                fontsize=fontsize, fontweight="bold", color=text_color,
                fontproperties=get_font(fontsize, "bold"), zorder=3)
        ax.text(x, y - 0.22 * h, sublabel, ha="center", va="center",
                fontsize=sublabel_size, color=C_TEXT_MED,
                fontproperties=get_font(sublabel_size), zorder=3,
                style="italic")
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fontsize, fontweight="bold", color=text_color,
                fontproperties=get_font(fontsize, "bold"), zorder=3)


def draw_arrow(ax, x1, y1, x2, y2, color=C_ARROW, lw=1.8, style="->", head_w=0.18, head_l=0.14):
    """Draw a styled arrow between two points."""
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(
                    arrowstyle=f"->,head_width={head_w},head_length={head_l}",
                    color=color, lw=lw,
                    connectionstyle="arc3,rad=0"
                ), zorder=1)


def draw_bidirectional_arrow(ax, x1, y1, x2, y2, color=C_ARROW, lw=1.5, head_w=0.14, head_l=0.10):
    """Draw a bidirectional arrow."""
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(
                    arrowstyle=f"<->,head_width={head_w},head_length={head_l}",
                    color=color, lw=lw,
                    connectionstyle="arc3,rad=0"
                ), zorder=1)


def setup_fig(width=14, height=9, title=None):
    """Create and configure a figure."""
    fig, ax = plt.subplots(figsize=(width, height), constrained_layout=True)
    fig.patch.set_facecolor(C_WHITE)
    ax.set_facecolor(C_WHITE)
    ax.set_xlim(0, width)
    ax.set_ylim(0, height)
    ax.axis("off")
    if title:
        ax.text(width / 2, height - 0.3, title, ha="center", va="top",
                fontsize=18, fontweight="bold", color=C_DARK_NAVY,
                fontproperties=get_font(18, "bold"))
    return fig, ax


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 1: System Architecture (Layered)
# ══════════════════════════════════════════════════════════════════════════════
def generate_system_arch():
    fig, ax = setup_fig(14, 10, "UPAS — System Architecture (Layered)")

    layers = [
        ("UI Layer", "React  ·  TypeScript  ·  Tailwind CSS", C_PALE_BLUE, C_BLUE),
        ("3D Visualization Engine", "Three.js  ·  React Three Fiber  ·  Drei", "#e8f0fe", C_BLUE),
        ("Engineering Calculation Engine", "TypeScript Modules (Penetration · Blast · Structure · Safety)", "#dde8f9", C_NAVY),
        ("Data Models & State Management", "TypeScript Interfaces  ·  Context  ·  Zustand", "#dce6f5", C_NAVY),
        ("Database Layer", "JSON Files  →  Phase 2: PostgreSQL", "#d0dff0", C_DARK_NAVY),
    ]

    n = len(layers)
    box_w = 11.0
    box_h = 1.15
    gap = 0.45
    total_h = n * box_h + (n - 1) * gap
    start_y = 8.5

    for i, (title, tech, bg, border) in enumerate(layers):
        y = start_y - i * (box_h + gap)
        # Shadow
        shadow = FancyBboxPatch(
            (7 - box_w / 2 + 0.06, y - box_h / 2 - 0.06), box_w, box_h,
            boxstyle="round,pad=0.15",
            facecolor="#c0cfe0", edgecolor="none", alpha=0.35, zorder=1
        )
        ax.add_patch(shadow)
        draw_rounded_box(ax, 7, y, box_w, box_h, title, tech,
                         facecolor=bg, edgecolor=border, linewidth=2,
                         fontsize=12, sublabel_size=10)
        # Layer number badge
        badge_x = 7 - box_w / 2 + 0.5
        circle = plt.Circle((badge_x, y), 0.28, color=border, zorder=4)
        ax.add_patch(circle)
        ax.text(badge_x, y, str(i + 1), ha="center", va="center",
                fontsize=10, fontweight="bold", color=C_WHITE,
                fontproperties=get_font(10, "bold"), zorder=5)

    # Arrows between layers
    for i in range(n - 1):
        y_top = start_y - i * (box_h + gap) - box_h / 2
        y_bot = start_y - (i + 1) * (box_h + gap) + box_h / 2
        mid_x = 7
        # Down arrow
        draw_arrow(ax, mid_x - 0.4, y_top - 0.05, mid_x - 0.4, y_bot + 0.05, color=C_NAVY)
        # Up arrow (data flows both ways)
        draw_arrow(ax, mid_x + 0.4, y_bot + 0.05, mid_x + 0.4, y_top - 0.05, color=C_SUBTLE, lw=1.2)

    # Legend
    ax.annotate("", xy=(12.5, 2.0), xytext=(11.5, 2.0),
                arrowprops=dict(arrowstyle="->,head_width=0.15,head_length=0.10",
                                color=C_NAVY, lw=1.5))
    ax.text(12.7, 2.0, "Data Flow", va="center", fontsize=9, color=C_TEXT_MED,
            fontproperties=get_font(9))
    ax.annotate("", xy=(11.5, 1.5), xytext=(12.5, 1.5),
                arrowprops=dict(arrowstyle="->,head_width=0.15,head_length=0.10",
                                color=C_SUBTLE, lw=1.2))
    ax.text(12.7, 1.5, "Response / Feedback", va="center", fontsize=9, color=C_SUBTLE,
            fontproperties=get_font(9))

    path = os.path.join(OUTPUT_DIR, "system_arch.png")
    fig.savefig(path, dpi=DPI, facecolor=C_WHITE, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 2: Component Architecture
# ══════════════════════════════════════════════════════════════════════════════
def generate_component_arch():
    fig, ax = setup_fig(14, 10, "UPAS — Component Architecture")

    # Define modules with positions
    # Center: 3D Visualization Engine
    # Right side: Calculation Engine, Results Dashboard, Reporting System
    # Left side: Project Management, Threat Definition, Soil Model, Structure Model

    modules = {
        "Project\nManagement":      {"pos": (2.5, 7.5), "color": C_PALE_BLUE, "icon": "📁"},
        "Threat\nDefinition":       {"pos": (2.5, 5.8), "color": C_PALE_BLUE, "icon": "⚠️"},
        "Soil\nModel":              {"pos": (2.5, 4.1), "color": C_PALE_BLUE, "icon": "🌍"},
        "Structure\nModel":         {"pos": (2.5, 2.4), "color": C_PALE_BLUE, "icon": "🏗️"},
        "3D Visualization\nEngine": {"pos": (7.0, 5.0), "color": "#dce6f5", "icon": "🧊"},
        "Calculation\nEngine":      {"pos": (11.5, 7.5), "color": "#dde8f9", "icon": "⚙️"},
        "Results\nDashboard":       {"pos": (11.5, 5.0), "color": "#dce6f5", "icon": "📊"},
        "Reporting\nSystem":        {"pos": (11.5, 2.5), "color": "#dce6f5", "icon": "📄"},
    }

    box_w = 2.8
    box_h = 1.3

    # Draw group labels
    ax.text(2.5, 8.7, "Data Input Modules", ha="center", va="center",
            fontsize=12, fontweight="bold", color=C_NAVY,
            fontproperties=get_font(12, "bold"))
    ax.text(2.5, 8.35, "━━━━━━━━━━━━━", ha="center", va="center",
            fontsize=9, color=C_BLUE)

    ax.text(11.5, 8.7, "Processing & Output Modules", ha="center", va="center",
            fontsize=12, fontweight="bold", color=C_NAVY,
            fontproperties=get_font(12, "bold"))
    ax.text(11.5, 8.35, "━━━━━━━━━━━━━━━━━━━━", ha="center", va="center",
            fontsize=9, color=C_BLUE)

    # Draw all modules
    for name, info in modules.items():
        x, y = info["pos"]
        # Shadow
        shadow = FancyBboxPatch(
            (x - box_w/2 + 0.05, y - box_h/2 - 0.05), box_w, box_h,
            boxstyle="round,pad=0.12",
            facecolor="#b8c9df", edgecolor="none", alpha=0.3, zorder=1
        )
        ax.add_patch(shadow)
        # Box
        box = FancyBboxPatch(
            (x - box_w/2, y - box_h/2), box_w, box_h,
            boxstyle="round,pad=0.12",
            facecolor=info["color"], edgecolor=C_NAVY, linewidth=1.8, zorder=2
        )
        ax.add_patch(box)
        ax.text(x, y, name, ha="center", va="center",
                fontsize=11, fontweight="bold", color=C_TEXT_DARK,
                fontproperties=get_font(11, "bold"), zorder=3,
                linespacing=1.3)

    # Draw connections
    # Left modules → 3D Visualization
    left_modules = ["Project\nManagement", "Threat\nDefinition", "Soil\nModel", "Structure\nModel"]
    for name in left_modules:
        x1, y1 = modules[name]["pos"]
        x2, y2 = modules["3D Visualization\nEngine"]["pos"]
        # Connect right edge of left box to left edge of center box
        draw_arrow(ax, x1 + box_w/2, y1, x2 - box_w/2, y2, color=C_BLUE, lw=1.3, head_w=0.13, head_l=0.10)

    # 3D Visualization ↔ Calculation Engine
    cx, cy = modules["3D Visualization\nEngine"]["pos"]
    rx, ry = modules["Calculation\nEngine"]["pos"]
    draw_bidirectional_arrow(ax, cx + box_w/2, cy + 0.25, rx - box_w/2, ry, color=C_NAVY, lw=2.0, head_w=0.14, head_l=0.10)

    # Calculation Engine → Results Dashboard
    rx2, ry2 = modules["Results\nDashboard"]["pos"]
    draw_arrow(ax, rx, ry - box_h/2, rx2, ry2 + box_h/2, color=C_NAVY, lw=1.8)

    # Results Dashboard → Reporting System
    rx3, ry3 = modules["Reporting\nSystem"]["pos"]
    draw_arrow(ax, rx2, ry2 - box_h/2, rx3, ry3 + box_h/2, color=C_NAVY, lw=1.8)

    # 3D Visualization → Results Dashboard
    draw_bidirectional_arrow(ax, cx + box_w/2, cy - 0.25, rx2 - box_w/2, ry2, color=C_BLUE, lw=1.3, head_w=0.12, head_l=0.09)

    path = os.path.join(OUTPUT_DIR, "component_arch.png")
    fig.savefig(path, dpi=DPI, facecolor=C_WHITE, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 3: Data Flow Diagram
# ══════════════════════════════════════════════════════════════════════════════
def generate_data_flow():
    fig, ax = setup_fig(14, 8, "UPAS — Data Flow Diagram")

    # Flow steps (horizontal flow with a branch at the end)
    steps = [
        {"label": "User\nInput", "pos": (1.8, 4.0), "color": C_PALE_BLUE, "shape": "box"},
        {"label": "Project\nWizard", "pos": (4.5, 4.0), "color": C_PALE_BLUE, "shape": "box"},
        {"label": "Data\nModels", "pos": (7.2, 4.0), "color": "#dce6f5", "shape": "box"},
        {"label": "Calculation\nEngine", "pos": (9.9, 4.0), "color": "#dde8f9", "shape": "box"},
        {"label": "Analysis\nResults", "pos": (12.3, 4.0), "color": "#d0dff0", "shape": "box"},
    ]

    # Output branch
    outputs = [
        {"label": "3D\nVisualization", "pos": (12.3, 6.2), "color": C_PALE_BLUE, "shape": "box"},
        {"label": "Results\nDashboard", "pos": (12.3, 1.8), "color": C_PALE_BLUE, "shape": "box"},
    ]
    final = {"label": "PDF\nReport", "pos": (12.3, 0.3), "color": "#c0d8f0", "shape": "box"}

    box_w = 2.0
    box_h = 1.2

    # Draw main flow boxes
    for s in steps:
        x, y = s["pos"]
        shadow = FancyBboxPatch(
            (x - box_w/2 + 0.04, y - box_h/2 - 0.04), box_w, box_h,
            boxstyle="round,pad=0.12", facecolor="#b8c9df", edgecolor="none", alpha=0.3, zorder=1
        )
        ax.add_patch(shadow)
        draw_rounded_box(ax, x, y, box_w, box_h, s["label"],
                         facecolor=s["color"], edgecolor=C_NAVY, linewidth=1.8,
                         fontsize=11)

    # Draw output boxes (slightly smaller)
    out_w = 2.0
    out_h = 1.0
    for o in outputs:
        x, y = o["pos"]
        shadow = FancyBboxPatch(
            (x - out_w/2 + 0.04, y - out_h/2 - 0.04), out_w, out_h,
            boxstyle="round,pad=0.10", facecolor="#b8c9df", edgecolor="none", alpha=0.3, zorder=1
        )
        ax.add_patch(shadow)
        draw_rounded_box(ax, x, y, out_w, out_h, o["label"],
                         facecolor=o["color"], edgecolor=C_BLUE, linewidth=1.5,
                         fontsize=10)

    # Final PDF Report box
    x, y = final["pos"]
    draw_rounded_box(ax, x, y, out_w, out_h, final["label"],
                     facecolor=final["color"], edgecolor=C_DARK_NAVY, linewidth=2.0,
                     fontsize=10)

    # Main flow arrows
    for i in range(len(steps) - 1):
        x1 = steps[i]["pos"][0] + box_w / 2
        y1 = steps[i]["pos"][1]
        x2 = steps[i + 1]["pos"][0] - box_w / 2
        y2 = steps[i + 1]["pos"][1]
        draw_arrow(ax, x1, y1, x2, y2, color=C_NAVY, lw=2.0)

    # Branch arrows from Analysis Results
    ar_x = steps[-1]["pos"][0]
    ar_y = steps[-1]["pos"][1]

    # Up to 3D Visualization
    draw_arrow(ax, ar_x, ar_y + box_h/2, outputs[0]["pos"][0], outputs[0]["pos"][1] - out_h/2,
               color=C_BLUE, lw=1.8)
    # Down to Results Dashboard
    draw_arrow(ax, ar_x, ar_y - box_h/2, outputs[1]["pos"][0], outputs[1]["pos"][1] + out_h/2,
               color=C_BLUE, lw=1.8)

    # Results Dashboard → PDF Report
    draw_arrow(ax, outputs[1]["pos"][0], outputs[1]["pos"][1] - out_h/2,
               final["pos"][0], final["pos"][1] + out_h/2,
               color=C_DARK_NAVY, lw=2.0)

    # Step number circles
    for i, s in enumerate(steps):
        cx = s["pos"][0] - box_w/2 + 0.35
        cy = s["pos"][1] + box_h/2 - 0.25
        circle = plt.Circle((cx, cy), 0.22, color=C_NAVY, zorder=5)
        ax.add_patch(circle)
        ax.text(cx, cy, str(i + 1), ha="center", va="center",
                fontsize=9, fontweight="bold", color=C_WHITE,
                fontproperties=get_font(9, "bold"), zorder=6)

    # Phase labels
    ax.text(3.15, 2.8, "Input Phase", ha="center", va="center",
            fontsize=10, color=C_SUBTLE, fontproperties=get_font(10), style="italic")
    ax.text(8.55, 2.8, "Processing Phase", ha="center", va="center",
            fontsize=10, color=C_SUBTLE, fontproperties=get_font(10), style="italic")
    ax.text(12.3, 2.8, "  ", ha="center", va="center", fontsize=10, color=C_SUBTLE)

    # Bracket lines for phases
    ax.plot([1.8, 1.8], [3.3, 3.05], color=C_SUBTLE, lw=1.0, ls="--")
    ax.plot([1.8, 4.5], [3.05, 3.05], color=C_SUBTLE, lw=1.0, ls="--")
    ax.plot([4.5, 4.5], [3.3, 3.05], color=C_SUBTLE, lw=1.0, ls="--")

    ax.plot([7.2, 7.2], [3.3, 3.05], color=C_SUBTLE, lw=1.0, ls="--")
    ax.plot([7.2, 12.3], [3.05, 3.05], color=C_SUBTLE, lw=1.0, ls="--")
    ax.plot([12.3, 12.3], [3.3, 3.05], color=C_SUBTLE, lw=1.0, ls="--")

    path = os.path.join(OUTPUT_DIR, "data_flow.png")
    fig.savefig(path, dpi=DPI, facecolor=C_WHITE, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 4: Folder Structure
# ══════════════════════════════════════════════════════════════════════════════
def generate_folder_structure():
    fig, ax = setup_fig(14, 10, "UPAS — Project Folder Structure")

    # Tree structure definition
    # (text, indent_level, is_folder, description)
    tree = [
        ("src/", 0, True, ""),
        ("components/", 1, True, ""),
        ("ui/", 2, True, "Buttons, Inputs, Cards"),
        ("3d/", 2, True, "Scene3D, Terrain, SoilLayers"),
        ("forms/", 2, True, "ThreatForm, SoilForm, StructureForm"),
        ("layout/", 2, True, "Sidebar, Header, Wizard"),
        ("pages/", 1, True, "Dashboard, ProjectView, AnalysisView"),
        ("models/", 1, True, "Project, Threat, Soil, Structure, AnalysisResult"),
        ("engineering/", 1, True, ""),
        ("calculations/", 2, True, "penetration, blast, structure, safety"),
        ("services/", 1, True, "projectService, calculationService"),
        ("database/", 1, True, "bombs.json, soils.json, materials.json"),
        ("store/", 1, True, "projectStore, uiStore"),
        ("hooks/", 1, True, "useProject, use3D, useAnalysis"),
        ("utils/", 1, True, "formatters, validators, constants"),
        ("types/", 1, True, "index.ts — all TypeScript interfaces"),
    ]

    # Layout parameters
    start_x = 1.0
    start_y = 9.0
    line_h = 0.52
    indent_w = 0.85

    for i, (text, level, is_folder, desc) in enumerate(tree):
        y = start_y - i * line_h
        x = start_x + level * indent_w

        # Draw tree connector lines
        if level > 0:
            parent_y_start = start_y - 0 * line_h  # y of "src/"
            for j in range(i):
                if tree[j][1] == level - 1 and tree[j][0].endswith("/"):
                    parent_y_start = start_y - j * line_h
                    break

            # Vertical line from parent down
            # Find the last child of this parent at this level
            last_child_idx = i
            for j in range(i + 1, len(tree)):
                if tree[j][1] <= level - 1:
                    break
                if tree[j][1] == level:
                    last_child_idx = j

            # Horizontal connector
            ax.plot([x - 0.4, x - 0.15], [y, y], color=C_BLUE, lw=1.2, zorder=1)

            # Vertical connector from parent
            parent_line_y_top = y + line_h * 0.0
            parent_line_y_bot = start_y - last_child_idx * line_h
            ax.plot([x - 0.4, x - 0.4], [parent_line_y_top, parent_line_y_bot],
                    color=C_BLUE, lw=1.2, zorder=1)

            # Vertical connector from grandparent for deeper levels
            if level >= 2:
                gp_x = start_x + (level - 1) * indent_w - 0.4
                # Find siblings after this item
                has_more_siblings = False
                for j in range(i + 1, len(tree)):
                    if tree[j][1] == level - 1:
                        has_more_siblings = True
                        break
                    if tree[j][1] < level - 1:
                        break
                if has_more_siblings:
                    ax.plot([gp_x, gp_x], [y, y - line_h * 0.5],
                            color=C_BLUE, lw=1.2, zorder=1)

        # Draw icon
        if is_folder:
            # Folder icon (small rectangle)
            folder_color = C_NAVY if level == 0 else C_BLUE
            icon_size = 0.18
            folder = FancyBboxPatch(
                (x - 0.05, y - icon_size/2), icon_size * 1.3, icon_size,
                boxstyle="round,pad=0.02",
                facecolor=folder_color, edgecolor=folder_color, linewidth=0.8, zorder=3
            )
            ax.add_patch(folder)

        # Draw text
        text_color = C_DARK_NAVY if level == 0 else C_TEXT_DARK
        fweight = "bold" if level <= 1 else "normal"
        fsize = 12 if level == 0 else (11 if level == 1 else 10)

        ax.text(x + 0.2, y, text, ha="left", va="center",
                fontsize=fsize, fontweight=fweight, color=text_color,
                fontproperties=get_font(fsize, fweight), zorder=3,
                family="monospace" if is_folder else "sans-serif")

        # Draw description in lighter color
        if desc:
            ax.text(x + 0.2 + len(text) * 0.085 + 0.4, y, f"  ({desc})",
                    ha="left", va="center", fontsize=9, color=C_SUBTLE,
                    fontproperties=get_font(9), zorder=3, style="italic")

    path = os.path.join(OUTPUT_DIR, "folder_structure.png")
    fig.savefig(path, dpi=DPI, facecolor=C_WHITE, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating UPAS architecture diagrams...")
    print()

    paths = []
    paths.append(generate_system_arch())
    paths.append(generate_component_arch())
    paths.append(generate_data_flow())
    paths.append(generate_folder_structure())

    print()
    print("All diagrams generated successfully:")
    for p in paths:
        size_kb = os.path.getsize(p) / 1024
        print(f"  {p}  ({size_kb:.0f} KB)")