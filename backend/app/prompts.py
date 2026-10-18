"""
Locked production prompts – do not change without testing.
These are the exact prompts that produced the high-quality results.
"""

ROTOR_SWAP_PROMPT = """
Replace only the two silver disc brake rotors in the first image with the black drilled and slotted brake rotor from the second image. Place two identical black rotors side by side in the exact same position, size, angle, and orientation as the original silver rotors. Keep every other element completely unchanged and identical: Brembo logo, ALE Auto Parts logo, all hardware pieces, brake pads, red/black product box, sensor wires, OEM seal, red disclaimer box, bottom gray banner with red text, white background, and full composition. Do not alter any branding, text, colors, logos, or other products. Photorealistic clean product composite.
""".strip()

def pad_swap_prompt(part_number: str) -> str:
    return f"""
Update the brake pads in the first image so they exactly match the real Brembo {part_number} pads from the reference images. The pads must have the correct shape, black backing plate with brand logo and part markings, and correct friction material. Arrange four pads in the same bottom positions as currently shown. Keep the two rotors, all hardware pieces, product box, sensor wire harness, logos, OEM seal, red disclaimer box, bottom banner text, and entire layout completely unchanged. Photorealistic clean product photo.
""".strip()

# Future expansion prompts can be added here
GENERIC_REPLACE_PROMPT = """
Replace only the specified product component in the first image with the object from the second image. Match position, scale, perspective and lighting exactly. Keep every other element of the template completely unchanged, including all branding, logos, text and layout. Photorealistic clean product composite.
""".strip()
