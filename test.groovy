def mongoIp = "1.2.3.4"
def script1 = """ \"mongodb://${mongoIp}:27017/placement_db\" -e JWT_SECRET=\"\\${JWT_SECRET:-change-me}\" """
println(script1)
