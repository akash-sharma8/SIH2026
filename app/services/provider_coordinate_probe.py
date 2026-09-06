# from typing import Any


# _COORDINATE_KEYS = {
#     "lat",
#     "latitude",
#     "lon",
#     "lng",
#     "longitude",
# }


# def find_coordinate_paths(
#     value: Any,
#     path: str = "root",
# ) -> list[str]:
#     matches: list[str] = []

#     if isinstance(value, dict):
#         keys = {
#             str(key).lower()
#             for key in value.keys()
#         }

#         coordinate_keys = (
#             keys
#             & _COORDINATE_KEYS
#         )

#         if coordinate_keys:
#             matches.append(
#                 f"{path}: "
#                 f"{sorted(coordinate_keys)}"
#             )

#         for key, nested_value in value.items():
#             matches.extend(
#                 find_coordinate_paths(
#                     nested_value,
#                     f"{path}.{key}",
#                 )
#             )

#     elif isinstance(value, list):
#         for index, item in enumerate(
#             value[:10]
#         ):
#             matches.extend(
#                 find_coordinate_paths(
#                     item,
#                     f"{path}[{index}]",
#                 )
#             )

#     return matches